using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Plms.Api.Models.Canonical;
using ZXing;
using ZXing.SkiaSharp;
using SkiaSharp;
using ZXing.Common;

namespace Plms.Api.Services
{
    public interface ILabelRenderService
    {
        byte[] GeneratePdf(CanonicalLabelModel model);
    }

    public class LabelRenderService : ILabelRenderService
    {
        public LabelRenderService()
        {
            // QuestPDF License - Required for latest versions
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public byte[] GeneratePdf(CanonicalLabelModel model)
        {
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(model.Dimensions.WidthMm, model.Dimensions.HeightMm, Unit.Millimetre);
                    page.Margin(0);
                    page.PageColor(Colors.White);

                    page.Content().Layers(layers =>
                    {
                        // QuestPDF requires exactly one primary layer. 
                        // It defines the size of the Layers element.
                        layers.PrimaryLayer().Height(model.Dimensions.HeightMm, Unit.Millimetre);

                        foreach (var el in model.Elements)
                        {
                            layers.Layer()
                                .TranslateX(el.XMm, Unit.Millimetre)
                                .TranslateY(el.YMm, Unit.Millimetre)
                                .Width(el.WidthMm, Unit.Millimetre)
                                .Height(el.HeightMm, Unit.Millimetre)
                                .Element(c => RenderElement(c, el));
                        }
                    });
                });
            });

            return document.GeneratePdf();
        }

        private void RenderElement(IContainer container, LabelElement el)
        {
            switch (el.Type.ToLower())
            {
                case "text":
                    container.Text(el.Content)
                        .FontSize(el.FontSizePt ?? 12)
                        .FontFamily(el.Font ?? Fonts.Arial);
                    break;

                case "rect":
                    var rect = container.Background(el.Fill ?? Colors.Transparent);
                    if (el.StrokeWidthMm > 0)
                    {
                        rect.Border(el.StrokeWidthMm.Value, Unit.Millimetre).BorderColor(el.Stroke ?? Colors.Black);
                    }
                    break;

                case "line":
                    container.Height(el.HeightMm > 0 ? el.HeightMm : 0.5f, Unit.Millimetre)
                        .Background(el.Stroke ?? Colors.Black);
                    break;

                case "barcode":
                case "qr":
                    byte[]? imageBytes = null;
                    if (el.Type.ToLower() == "qr")
                    {
                        imageBytes = GenerateQrCode(el.Content, (int)(el.WidthMm * 3.78), (int)(el.HeightMm * 3.78));
                    }
                    else
                    {
                        imageBytes = GenerateBarcode(el.Content, el.BarcodeType ?? "CODE_128", (int)(el.WidthMm * 3.78), (int)(el.HeightMm * 3.78));
                    }

                    if (imageBytes != null)
                    {
                        container.Image(imageBytes);
                    }
                    else
                    {
                        container.Background(Colors.Grey.Lighten4)
                            .Border(0.2f, Unit.Millimetre)
                            .BorderColor(Colors.Grey.Medium)
                            .AlignCenter()
                            .AlignMiddle()
                            .Text($"[FAILED: {el.Type.ToUpper()}]")
                            .FontSize(6)
                            .FontColor(Colors.Red.Medium);
                    }
                    break;

                case "image":
                    container.Background(Colors.Blue.Lighten5)
                        .AlignCenter()
                        .AlignMiddle()
                        .Text("IMAGE")
                        .FontSize(8)
                        .FontColor(Colors.Blue.Medium);
                    break;
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
                var format = type.ToUpper() switch
                {
                    "CODE_128" => BarcodeFormat.CODE_128,
                    "EAN_13" => BarcodeFormat.EAN_13,
                    _ => BarcodeFormat.CODE_128 // Default to 128
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
