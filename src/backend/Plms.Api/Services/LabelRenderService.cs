using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Models.Canonical;
using SkiaSharp;
using System.Text;
using ZXing;
using ZXing.Common;
using ZXing.SkiaSharp;

namespace Plms.Api.Services
{
    public interface ILabelRenderService
    {
        byte[] GeneratePdf(CanonicalLabelModel model);
    }

    public class LabelRenderService : ILabelRenderService
    {
        private readonly ApplicationDbContext? _dbContext;

        public LabelRenderService(ApplicationDbContext? dbContext = null)
        {
            _dbContext = dbContext;
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public byte[] GeneratePdf(CanonicalLabelModel model)
        {
            var pageWidthMm = model.Dimensions.WidthMm;
            var pageHeightMm = model.Dimensions.HeightMm;

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(pageWidthMm, pageHeightMm, Unit.Millimetre);
                    page.Margin(0);
                    page.PageColor(Colors.White);

                    page.Content().Layers(layers =>
                    {
                        layers.PrimaryLayer()
                            .Width(pageWidthMm, Unit.Millimetre)
                            .Height(pageHeightMm, Unit.Millimetre);

                        foreach (var element in model.Elements.Where(element => element.Visible != false))
                        {
                            layers.Layer()
                                .Unconstrained()
                                .TranslateX(element.XMm, Unit.Millimetre)
                                .TranslateY(element.YMm, Unit.Millimetre)
                                .Width(element.WidthMm, Unit.Millimetre)
                                .Height(element.HeightMm, Unit.Millimetre)
                                .Element(container => RenderRotatedElement(container, element));
                        }
                    });
                });
            });

            return document.GeneratePdf();
        }

        private void RenderRotatedElement(IContainer container, LabelElement element)
        {
            var rotation = NormalizeRotation(element.Rotation);

            if (rotation == 0)
            {
                RenderElement(container, element);
                return;
            }

            // Match the editor's transform model: rotate around the element center
            // rather than using QuestPDF's constrained right/left rotation semantics.
            container
                .TranslateX(element.WidthMm / 2f, Unit.Millimetre)
                .TranslateY(element.HeightMm / 2f, Unit.Millimetre)
                .Rotate(rotation)
                .TranslateX(-element.WidthMm / 2f, Unit.Millimetre)
                .TranslateY(-element.HeightMm / 2f, Unit.Millimetre)
                .Element(inner => RenderElement(inner, element));
        }

        private void RenderElement(IContainer container, LabelElement element)
        {
            switch (element.Type.ToLowerInvariant())
            {
                case "text":
                    RenderText(container, element);
                    break;

                case "rect":
                    RenderRectangle(container, element);
                    break;

                case "ellipse":
                    RenderEllipse(container, element);
                    break;

                case "line":
                    RenderLine(container, element);
                    break;

                case "barcode":
                case "qr":
                    RenderMachineCode(container, element);
                    break;

                case "image":
                    RenderImage(container, element);
                    break;
            }
        }

        private void RenderText(IContainer container, LabelElement element)
        {
            var alignedContainer = ApplyHorizontalAlignment(ApplyVerticalAlignment(container, element.VerticalAlign), element.TextAlign);
            alignedContainer.Text(text =>
            {
                var span = text.Span(ApplyTextTransform(element.Content ?? string.Empty, element.TextTransform))
                    .FontSize(element.FontSizePt ?? 12)
                    .FontFamily(string.IsNullOrWhiteSpace(element.Font) ? Fonts.Arial : element.Font)
                    .FontColor(string.IsNullOrWhiteSpace(element.Fill) ? "#000000" : element.Fill)
                    .LineHeight(element.LineHeight ?? 1f)
                    .LetterSpacing(element.LetterSpacingPt ?? 0f);

                if (string.Equals(element.FontWeight, "bold", StringComparison.OrdinalIgnoreCase))
                {
                    span.Bold();
                }
            });
        }

        private void RenderRectangle(IContainer container, LabelElement element)
        {
            var fillColor = string.IsNullOrWhiteSpace(element.Fill) ? "#00000000" : element.Fill;
            var rect = container.Background(fillColor);
            if (!string.IsNullOrWhiteSpace(element.Stroke) && (element.StrokeWidthMm ?? 0) > 0)
            {
                rect.Border(element.StrokeWidthMm!.Value, Unit.Millimetre)
                    .BorderColor(string.IsNullOrWhiteSpace(element.Stroke) ? "#000000" : element.Stroke);
            }
        }

        private void RenderEllipse(IContainer container, LabelElement element)
        {
            var fill = string.IsNullOrWhiteSpace(element.Fill) ? "none" : element.Fill!;
            var stroke = string.IsNullOrWhiteSpace(element.Stroke) || (element.StrokeWidthMm ?? 0) <= 0 ? "none" : element.Stroke!;
            var strokeWidth = stroke == "none"
                ? "0"
                : Math.Max(0.1f, (element.StrokeWidthMm ?? 0.4f) * 3.5f).ToString(System.Globalization.CultureInfo.InvariantCulture);

            var svg = $"""
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <ellipse cx="50" cy="50" rx="49" ry="49" fill="{fill}" stroke="{stroke}" stroke-width="{strokeWidth}" />
                </svg>
                """;

            container.Svg(svg);
        }

        private void RenderLine(IContainer container, LabelElement element)
        {
            if (string.IsNullOrWhiteSpace(element.Stroke) || (element.StrokeWidthMm ?? 0) <= 0)
            {
                return;
            }

            var thickness = Math.Max(0.2f, element.StrokeWidthMm ?? 0.5f);
            var color = string.IsNullOrWhiteSpace(element.Stroke) ? "#000000" : element.Stroke!;

            if (string.Equals(element.LineDirection, "vertical", StringComparison.OrdinalIgnoreCase))
            {
                container.AlignCenter()
                    .Width(thickness, Unit.Millimetre)
                    .Background(color);
                return;
            }

            container.AlignMiddle()
                .Height(thickness, Unit.Millimetre)
                .Background(color);
        }

        private void RenderMachineCode(IContainer container, LabelElement element)
        {
            byte[]? imageBytes = element.Type.Equals("qr", StringComparison.OrdinalIgnoreCase)
                ? GenerateQrCode(element.Content, (int)(element.WidthMm * 3.78f), (int)(element.HeightMm * 3.78f))
                : GenerateBarcode(element.Content, element.BarcodeType ?? "CODE_128", (int)(element.WidthMm * 3.78f), (int)(element.HeightMm * 3.78f));

            if (imageBytes != null)
            {
                container.Image(imageBytes);
                return;
            }

            RenderFallback(container, $"FAILED: {element.Type.ToUpperInvariant()}", Colors.Red.Medium);
        }

        private void RenderImage(IContainer container, LabelElement element)
        {
            if (TryResolveImageSource(element, out var mediaType, out var bytes))
            {
                var framedContainer = ApplyImageFrame(container, element);
                var alignedContainer = ApplyHorizontalAlignment(
                    ApplyVerticalAlignment(framedContainer, NormalizeImageAlignY(element.ImageAlignY)),
                    NormalizeImageAlignX(element.ImageAlignX));

                if (string.Equals(mediaType, "image/svg+xml", StringComparison.OrdinalIgnoreCase))
                {
                    var svg = alignedContainer.Svg(Encoding.UTF8.GetString(bytes));
                    ApplyImageFit(svg, element.ImageFit);
                    return;
                }

                var image = alignedContainer.Image(bytes);
                ApplyImageFit(image, element.ImageFit);
                return;
            }

            RenderFallback(container, "IMAGE", Colors.Blue.Medium);
        }

        private bool TryResolveImageSource(LabelElement element, out string mediaType, out byte[] bytes)
        {
            if (TryResolveAssetImage(element, out mediaType, out bytes))
            {
                return true;
            }

            return TryDecodeDataUri(element.Content, out mediaType, out bytes);
        }

        private bool TryResolveAssetImage(LabelElement element, out string mediaType, out byte[] bytes)
        {
            mediaType = string.Empty;
            bytes = [];

            if (_dbContext == null || string.IsNullOrWhiteSpace(element.AssetId) || !Guid.TryParse(element.AssetId, out var assetId))
            {
                return false;
            }

            var asset = _dbContext.ContentAssets
                .AsNoTracking()
                .FirstOrDefault(item => item.Id == assetId && item.IsActive);

            if (asset == null || asset.StorageData.Length == 0)
            {
                return false;
            }

            mediaType = asset.MimeType;
            bytes = asset.StorageData;
            return true;
        }

        private static IContainer ApplyHorizontalAlignment(IContainer container, string? textAlign)
        {
            return (textAlign ?? "left").ToLowerInvariant() switch
            {
                "center" => container.AlignCenter(),
                "right" => container.AlignRight(),
                _ => container.AlignLeft()
            };
        }

        private static void ApplyImageFit(dynamic descriptor, string? imageFit)
        {
            switch ((imageFit ?? "contain").ToLowerInvariant())
            {
                case "stretch":
                    descriptor.FitUnproportionally();
                    break;
                case "cover":
                    descriptor.FitWidth();
                    break;
                default:
                    descriptor.FitArea();
                    break;
            }
        }

        private static IContainer ApplyImageFrame(IContainer container, LabelElement element)
        {
            var framed = container;

            if (!string.IsNullOrWhiteSpace(element.FrameFill))
            {
                framed = framed.Background(element.FrameFill!);
            }

            if (!string.IsNullOrWhiteSpace(element.FrameStroke) && (element.FrameStrokeWidthMm ?? 0) > 0)
            {
                framed = framed.Border(element.FrameStrokeWidthMm!.Value, Unit.Millimetre)
                    .BorderColor(element.FrameStroke!);
            }

            return framed;
        }

        private static string NormalizeImageAlignX(string? imageAlignX)
        {
            return (imageAlignX ?? "center").ToLowerInvariant() switch
            {
                "left" => "left",
                "right" => "right",
                _ => "center",
            };
        }

        private static string NormalizeImageAlignY(string? imageAlignY)
        {
            return (imageAlignY ?? "middle").ToLowerInvariant() switch
            {
                "top" => "top",
                "bottom" => "bottom",
                _ => "middle",
            };
        }

        private static IContainer ApplyVerticalAlignment(IContainer container, string? verticalAlign)
        {
            return (verticalAlign ?? "middle").ToLowerInvariant() switch
            {
                "top" => container.AlignTop(),
                "bottom" => container.AlignBottom(),
                _ => container.AlignMiddle(),
            };
        }

        private static string ApplyTextTransform(string content, string? textTransform)
        {
            return (textTransform ?? "none").ToLowerInvariant() switch
            {
                "uppercase" => content.ToUpperInvariant(),
                "lowercase" => content.ToLowerInvariant(),
                _ => content,
            };
        }

        private static int NormalizeRotation(float? rotation)
        {
            var discrete = new[] { 0, 90, 180, 270 };
            var value = (int)Math.Round(rotation ?? 0);
            return discrete.Contains(value) ? value : 0;
        }

        private static void RenderFallback(IContainer container, string label, string color)
        {
            container.Background(Colors.Grey.Lighten4)
                .Border(0.2f, Unit.Millimetre)
                .BorderColor(Colors.Grey.Medium)
                .AlignCenter()
                .AlignMiddle()
                .Text(label)
                .FontSize(6)
                .FontColor(color);
        }

        private static bool TryDecodeDataUri(string? content, out string mediaType, out byte[] bytes)
        {
            mediaType = string.Empty;
            bytes = [];

            if (string.IsNullOrWhiteSpace(content) || !content.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var commaIndex = content.IndexOf(',');
            if (commaIndex <= 5)
            {
                return false;
            }

            var metadata = content[5..commaIndex];
            var payload = content[(commaIndex + 1)..];
            var parts = metadata.Split(';', StringSplitOptions.RemoveEmptyEntries);
            mediaType = parts.FirstOrDefault() ?? string.Empty;
            var isBase64 = parts.Any(part => part.Equals("base64", StringComparison.OrdinalIgnoreCase));

            try
            {
                bytes = isBase64
                    ? Convert.FromBase64String(payload)
                    : Encoding.UTF8.GetBytes(Uri.UnescapeDataString(payload));
                return bytes.Length > 0;
            }
            catch
            {
                bytes = [];
                mediaType = string.Empty;
                return false;
            }
        }

        private byte[]? GenerateQrCode(string content, int width, int height)
        {
            try
            {
                var writer = new BarcodeWriter
                {
                    Format = BarcodeFormat.QR_CODE,
                    Options = new EncodingOptions
                    {
                        Width = width,
                        Height = height,
                        Margin = 0
                    }
                };
                using var bitmap = writer.Write(content);
                using var image = SKImage.FromBitmap(bitmap);
                using var data = image.Encode(SKEncodedImageFormat.Png, 100);
                return data.ToArray();
            }
            catch
            {
                return null;
            }
        }

        private byte[]? GenerateBarcode(string content, string type, int width, int height)
        {
            try
            {
                var format = type.ToUpperInvariant() switch
                {
                    "CODE_128" => BarcodeFormat.CODE_128,
                    "EAN_13" => BarcodeFormat.EAN_13,
                    _ => BarcodeFormat.CODE_128
                };

                var writer = new BarcodeWriter
                {
                    Format = format,
                    Options = new EncodingOptions
                    {
                        Width = width,
                        Height = height,
                        Margin = 10,
                        PureBarcode = false
                    }
                };
                using var bitmap = writer.Write(content);
                using var image = SKImage.FromBitmap(bitmap);
                using var data = image.Encode(SKEncodedImageFormat.Png, 100);
                return data.ToArray();
            }
            catch
            {
                return null;
            }
        }
    }
}
