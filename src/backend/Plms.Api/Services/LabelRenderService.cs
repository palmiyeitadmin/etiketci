using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Models.Canonical;
using SkiaSharp;
using System.Globalization;
using System.Security;
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
            if (TryResolveAssetImage(element, out var assetMediaType, out var assetBytes))
            {
                container.Svg(BuildImageFrameSvg(
                    $"data:{assetMediaType};base64,{Convert.ToBase64String(assetBytes)}",
                    element));
                return;
            }

            if (TryDecodeDataUri(element.Content, out var mediaType, out var bytes))
            {
                container.Svg(BuildImageFrameSvg(
                    string.Equals(mediaType, "image/svg+xml", StringComparison.OrdinalIgnoreCase)
                        ? $"data:{mediaType};base64,{Convert.ToBase64String(bytes)}"
                        : element.Content,
                    element));
                return;
            }

            RenderFallback(container, "IMAGE", Colors.Blue.Medium);
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

        private static string BuildImageFrameSvg(string href, LabelElement element)
        {
            var width = element.WidthMm.ToString(CultureInfo.InvariantCulture);
            var height = element.HeightMm.ToString(CultureInfo.InvariantCulture);
            var radius = Math.Max(0, element.CornerRadiusMm ?? 0).ToString(CultureInfo.InvariantCulture);
            var strokeWidth = Math.Max(0, element.FrameStrokeWidthMm ?? 0).ToString(CultureInfo.InvariantCulture);
            var fill = string.IsNullOrWhiteSpace(element.FrameFill) ? "none" : element.FrameFill;
            var stroke = string.IsNullOrWhiteSpace(element.FrameStroke) ? "none" : element.FrameStroke;
            var preserveAspectRatio = BuildPreserveAspectRatio(element);
            var clipId = $"clip-{element.Id}";
            var clip = (element.CornerRadiusMm ?? 0) > 0
                ? $"<defs><clipPath id=\"{clipId}\"><rect x=\"0\" y=\"0\" width=\"{width}\" height=\"{height}\" rx=\"{radius}\" ry=\"{radius}\" /></clipPath></defs>"
                : string.Empty;
            var clipAttribute = (element.CornerRadiusMm ?? 0) > 0 ? $" clip-path=\"url(#{clipId})\"" : string.Empty;

            return $"""
                <svg xmlns="http://www.w3.org/2000/svg" width="{width}mm" height="{height}mm" viewBox="0 0 {width} {height}">
                  {clip}
                  <rect x="0" y="0" width="{width}" height="{height}" rx="{radius}" ry="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{strokeWidth}" />
                  <image href="{SecurityElement.Escape(href)}" x="0" y="0" width="{width}" height="{height}" preserveAspectRatio="{preserveAspectRatio}"{clipAttribute} />
                </svg>
                """;
        }

        private static string BuildPreserveAspectRatio(LabelElement element)
        {
            var alignX = (element.ImageAlignX ?? "center").ToLowerInvariant() switch
            {
                "left" => "Min",
                "right" => "Max",
                _ => "Mid",
            };

            var alignY = (element.ImageAlignY ?? "middle").ToLowerInvariant() switch
            {
                "top" => "Min",
                "bottom" => "Max",
                _ => "Mid",
            };

            return (element.ImageFit ?? "contain").ToLowerInvariant() switch
            {
                "stretch" => "none",
                "cover" => $"x{alignX}Y{alignY} slice",
                _ => $"x{alignX}Y{alignY} meet",
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
