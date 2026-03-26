using Plms.Api.Models.Canonical;
using Plms.Api.Services;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

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
        var text = Encoding.ASCII.GetString(pdf);

        Assert.NotNull(pdf);
        Assert.True(pdf.Length > 1024, $"Expected generated PDF to be non-trivial, got {pdf.Length} bytes.");
        Assert.Matches(@"/Subtype\s*/Image", text);
    }

    [Fact]
    public void GeneratePdf_With100x80Label_ShouldExposeExpectedMediaBox()
    {
        var service = new LabelRenderService();
        var model = new CanonicalLabelModel
        {
            Name = "MediaBox",
            Dimensions = new LabelDimensions { WidthMm = 100, HeightMm = 80 },
            Elements =
            [
                new LabelElement
                {
                    Id = "text-1",
                    Type = "text",
                    XMm = 5,
                    YMm = 5,
                    WidthMm = 20,
                    HeightMm = 10,
                    Content = "PDF",
                    Fill = "#111827"
                }
            ]
        };

        var pdf = service.GeneratePdf(model);
        var text = Encoding.ASCII.GetString(pdf);
        var match = Regex.Match(text, @"/MediaBox\s*\[\s*0\s+0\s+(?<width>[\d.]+)\s+(?<height>[\d.]+)\s*\]");

        Assert.True(match.Success, "Expected generated PDF to include a MediaBox declaration.");

        var width = double.Parse(match.Groups["width"].Value, CultureInfo.InvariantCulture);
        var height = double.Parse(match.Groups["height"].Value, CultureInfo.InvariantCulture);
        var expectedWidth = 100d / 25.4d * 72d;
        var expectedHeight = 80d / 25.4d * 72d;

        Assert.InRange(width, expectedWidth - 0.75d, expectedWidth + 0.75d);
        Assert.InRange(height, expectedHeight - 0.75d, expectedHeight + 0.75d);
    }

    [Fact]
    public void GeneratePdf_WithAdvancedTextAndImageStyling_ShouldSucceed()
    {
        var service = new LabelRenderService();
        var model = new CanonicalLabelModel
        {
            Name = "Styled",
            Dimensions = new LabelDimensions { WidthMm = 100, HeightMm = 80 },
            Elements =
            [
                new LabelElement
                {
                    Id = "text-1",
                    Type = "text",
                    XMm = 5,
                    YMm = 5,
                    WidthMm = 40,
                    HeightMm = 20,
                    Content = "Styled Text",
                    TextAlign = "center",
                    VerticalAlign = "bottom",
                    LineHeight = 1.2f,
                    LetterSpacingPt = 0.4f,
                    TextTransform = "uppercase",
                    FontWeight = "bold",
                    Fill = "#111827"
                },
                new LabelElement
                {
                    Id = "image-1",
                    Type = "image",
                    XMm = 50,
                    YMm = 10,
                    WidthMm = 25,
                    HeightMm = 25,
                    Content = OnePixelPngDataUri,
                    ImageFit = "cover",
                    ImageAlignX = "right",
                    ImageAlignY = "bottom",
                    CornerRadiusMm = 2,
                    FrameFill = "#e2e8f0",
                    FrameStroke = "#0f172a",
                    FrameStrokeWidthMm = 0.4f
                }
            ]
        };

        var pdf = service.GeneratePdf(model);
        var text = Encoding.ASCII.GetString(pdf);

        Assert.NotNull(pdf);
        Assert.True(pdf.Length > 1024, $"Expected styled PDF to be non-trivial, got {pdf.Length} bytes.");
        Assert.Matches(@"/Subtype\s*/Image", text);
    }
}
