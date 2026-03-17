using Plms.Api.Models.Canonical;
using Plms.Api.Services;

namespace Plms.Tests;

public class LabelRenderParityTests
{
    private const string OnePixelPngDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pG1cAAAAASUVORK5CYII=";

    [Fact]
    public void GeneratePdf_WithHiddenElementsAndEmbeddedImage_ShouldSucceed()
    {
        var service = new LabelRenderService();
        var model = new CanonicalLabelModel
        {
            Name = "Parity",
            Dimensions = new LabelDimensions { WidthMm = 100, HeightMm = 150 },
            Elements =
            [
                new LabelElement
                {
                    Id = "text-1",
                    Type = "text",
                    XMm = 5,
                    YMm = 5,
                    WidthMm = 50,
                    HeightMm = 12,
                    Content = "Aligned text",
                    TextAlign = "center",
                    FontWeight = "bold",
                    Fill = "#111827"
                },
                new LabelElement
                {
                    Id = "line-1",
                    Type = "line",
                    XMm = 70,
                    YMm = 10,
                    WidthMm = 2,
                    HeightMm = 40,
                    Stroke = "#0f172a",
                    StrokeWidthMm = 0.8f,
                    LineDirection = "vertical"
                },
                new LabelElement
                {
                    Id = "image-1",
                    Type = "image",
                    XMm = 10,
                    YMm = 30,
                    WidthMm = 20,
                    HeightMm = 20,
                    Content = OnePixelPngDataUri,
                    ImageFit = "contain"
                },
                new LabelElement
                {
                    Id = "hidden-1",
                    Type = "rect",
                    XMm = 0,
                    YMm = 0,
                    WidthMm = 100,
                    HeightMm = 10,
                    Content = string.Empty,
                    Fill = "#ef4444",
                    Visible = false
                }
            ]
        };

        var pdf = service.GeneratePdf(model);

        Assert.NotNull(pdf);
        Assert.True(pdf.Length > 1024, $"Expected generated PDF to be non-trivial, got {pdf.Length} bytes.");
    }
}
