using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using Plms.Api.Models.Canonical;
using Plms.Api.Services;
using SkiaSharp;

namespace Plms.Tests
{
    /// <summary>
    /// Renders reference labels to PNG (from the same document the PDF uses) and compares them with
    /// committed images in Golden/. A change in how labels print shows up here as a failing test.
    ///
    /// To accept an intended change: PLMS_UPDATE_GOLDEN=1 dotnet run --project src/backend/Plms.Tests
    /// On a mismatch the rendered image and a red diff are written to Golden/_actual/ for inspection.
    /// </summary>
    public class GoldenImageTests
    {
        private const int Dpi = 300;

        // Anti-aliasing can move a few edge pixels between machines; real changes move far more.
        private const int ChannelTolerance = 48;
        private const double MaxDifferentPixelRatio = 0.002;

        public static TheoryData<string> Samples() => new(GoldenLabels.All.Keys);

        [Theory]
        [MemberData(nameof(Samples))]
        public void Label_MatchesGoldenImage(string name)
        {
            var model = GoldenLabels.All[name]();
            var service = new LabelRenderService();

            var images = service.GenerateImages(model, Dpi, name == "proof-watermark" ? "PROVA" : null);

            Assert.Single(images);
            AssertMatchesGolden(name, images[0]);
        }

        [Theory]
        [InlineData(1)]
        [InlineData(3)]
        [InlineData(25)]
        public void GeneratePdf_WithCopies_HasOnePagePerCopy(int copies)
        {
            var pdf = new LabelRenderService().GeneratePdf(GoldenLabels.All["profile-label-tr"](), copies, null);

            Assert.Equal(copies, CountPdfPages(pdf));
        }

        [Fact]
        public void GeneratePdf_RejectsCopiesOutsideTheAllowedRange()
        {
            var service = new LabelRenderService();
            var model = GoldenLabels.All["profile-label-tr"]();

            Assert.Throws<ArgumentOutOfRangeException>(() => service.GeneratePdf(model, 0, null));
            Assert.Throws<ArgumentOutOfRangeException>(() => service.GeneratePdf(model, LabelRenderService.MaxCopies + 1, null));
        }

        /// <summary>
        /// Page count of a QuestPDF document. Large documents have a nested page tree whose inner nodes carry
        /// partial counts; the root /Count is the largest one. (Labels have no outlines, the other /Count user.)
        /// </summary>
        public static int CountPdfPages(byte[] pdf)
        {
            var text = System.Text.Encoding.Latin1.GetString(pdf);
            var counts = Regex.Matches(text, @"/Count\s+(\d+)").Select(match => int.Parse(match.Groups[1].Value)).ToList();
            Assert.NotEmpty(counts);
            return counts.Max();
        }

        private static void AssertMatchesGolden(string name, byte[] actualPng, [CallerFilePath] string callerFile = "")
        {
            var goldenDirectory = Path.Combine(Path.GetDirectoryName(callerFile)!, "Golden");
            var goldenPath = Path.Combine(goldenDirectory, $"{name}.png");

            if (Environment.GetEnvironmentVariable("PLMS_UPDATE_GOLDEN") == "1" || !File.Exists(goldenPath))
            {
                Directory.CreateDirectory(goldenDirectory);
                File.WriteAllBytes(goldenPath, actualPng);
                Assert.SkipWhen(Environment.GetEnvironmentVariable("PLMS_UPDATE_GOLDEN") != "1",
                    $"No golden image existed for '{name}'; it was created at {goldenPath}. Review and commit it.");
                return;
            }

            using var expected = SKBitmap.Decode(goldenPath);
            using var actual = SKBitmap.Decode(actualPng);
            Assert.Equal((expected.Width, expected.Height), (actual.Width, actual.Height));

            var different = 0;
            using var diff = new SKBitmap(actual.Width, actual.Height);
            for (var y = 0; y < actual.Height; y++)
            {
                for (var x = 0; x < actual.Width; x++)
                {
                    var a = expected.GetPixel(x, y);
                    var b = actual.GetPixel(x, y);
                    var delta = Math.Max(Math.Max(Math.Abs(a.Red - b.Red), Math.Abs(a.Green - b.Green)), Math.Max(Math.Abs(a.Blue - b.Blue), Math.Abs(a.Alpha - b.Alpha)));
                    if (delta > ChannelTolerance)
                    {
                        different++;
                        diff.SetPixel(x, y, SKColors.Red);
                    }
                    else
                    {
                        diff.SetPixel(x, y, new SKColor(b.Red, b.Green, b.Blue, 60));
                    }
                }
            }

            var ratio = different / (double)(actual.Width * actual.Height);
            if (ratio > MaxDifferentPixelRatio)
            {
                var outDirectory = Path.Combine(goldenDirectory, "_actual");
                Directory.CreateDirectory(outDirectory);
                File.WriteAllBytes(Path.Combine(outDirectory, $"{name}.png"), actualPng);
                using var diffImage = SKImage.FromBitmap(diff);
                using var diffData = diffImage.Encode(SKEncodedImageFormat.Png, 100);
                File.WriteAllBytes(Path.Combine(outDirectory, $"{name}.diff.png"), diffData.ToArray());
            }

            Assert.True(ratio <= MaxDifferentPixelRatio,
                $"'{name}' differs from its golden image in {ratio:P3} of pixels (limit {MaxDifferentPixelRatio:P1}). See Golden/_actual/.");
        }
    }

    /// <summary>Reference labels covering what the printer must get right: Turkish text, every barcode type, QR, shapes, rotation, images.</summary>
    public static class GoldenLabels
    {
        public static readonly IReadOnlyDictionary<string, Func<CanonicalLabelModel>> All = new Dictionary<string, Func<CanonicalLabelModel>>
        {
            ["profile-label-tr"] = () => Label(60, 40,
                new LabelElement { Id = "band", Type = "rect", XMm = 0, YMm = 0, WidthMm = 60, HeightMm = 9, Fill = "#fce300" },
                new LabelElement { Id = "brand", Type = "text", Content = "PALMİYE", XMm = 3, YMm = 2, WidthMm = 40, HeightMm = 6, FontSizePt = 11, FontWeight = "bold", Fill = "#111111" },
                new LabelElement { Id = "name", Type = "text", Content = "Skyroof Prestige · 4000 mm", XMm = 3, YMm = 11, WidthMm = 54, HeightMm = 6, FontSizePt = 10, Fill = "#111111" },
                new LabelElement { Id = "chars", Type = "text", Content = "ÇĞİÖŞÜ çğıöşü", XMm = 3, YMm = 17.5f, WidthMm = 54, HeightMm = 4, FontSizePt = 7, Fill = "#444444" },
                new LabelElement { Id = "bc", Type = "barcode", BarcodeType = "CODE_128", Content = "SKY-PRS-LML-4000", XMm = 3, YMm = 23, WidthMm = 38, HeightMm = 14 },
                new LabelElement { Id = "qr", Type = "qr", Content = "SKY-PRS-LML-4000", XMm = 44, YMm = 23, WidthMm = 13, HeightMm = 13 }),

            ["fonts"] = () => Label(80, 40,
                new LabelElement { Id = "a", Type = "text", Content = "Arial Şablon 123", Font = "Arial", XMm = 2, YMm = 2, WidthMm = 76, HeightMm = 8, FontSizePt = 12 },
                new LabelElement { Id = "t", Type = "text", Content = "Times New Roman Şablon", Font = "Times New Roman", XMm = 2, YMm = 11, WidthMm = 76, HeightMm = 8, FontSizePt = 12 },
                new LabelElement { Id = "c", Type = "text", Content = "Courier New Şablon", Font = "Courier New", XMm = 2, YMm = 20, WidthMm = 76, HeightMm = 8, FontSizePt = 12 },
                new LabelElement { Id = "v", Type = "text", Content = "Verdana Şablon", Font = "Verdana", XMm = 2, YMm = 29, WidthMm = 76, HeightMm = 8, FontSizePt = 12 }),

            ["barcodes"] = () => Label(100, 70,
                new LabelElement { Id = "c128", Type = "barcode", BarcodeType = "CODE_128", Content = "PLMS-12345", XMm = 4, YMm = 4, WidthMm = 92, HeightMm = 18 },
                new LabelElement { Id = "ean", Type = "barcode", BarcodeType = "EAN_13", Content = "8690000000012", XMm = 4, YMm = 26, WidthMm = 60, HeightMm = 18 },
                new LabelElement { Id = "c39", Type = "barcode", BarcodeType = "CODE_39", Content = "PLMS-39", XMm = 4, YMm = 48, WidthMm = 92, HeightMm = 18 }),

            ["shapes-rotation"] = () => Label(60, 60,
                new LabelElement { Id = "frame", Type = "rect", XMm = 1, YMm = 1, WidthMm = 58, HeightMm = 58, Stroke = "#111111", StrokeWidthMm = 0.5f },
                new LabelElement { Id = "circle", Type = "ellipse", XMm = 6, YMm = 6, WidthMm = 20, HeightMm = 20, Fill = "#0e7490" },
                new LabelElement { Id = "line", Type = "line", XMm = 6, YMm = 32, WidthMm = 48, HeightMm = 1, Stroke = "#dc2626", StrokeWidthMm = 0.6f },
                new LabelElement { Id = "rot", Type = "text", Content = "90° döndürülmüş", Rotation = 90, XMm = 30, YMm = 36, WidthMm = 30, HeightMm = 6, FontSizePt = 8 }),

            ["proof-watermark"] = () => Label(60, 40,
                new LabelElement { Id = "name", Type = "text", Content = "Taslak etiket", XMm = 3, YMm = 4, WidthMm = 54, HeightMm = 6, FontSizePt = 10 }),
        };

        private static CanonicalLabelModel Label(float widthMm, float heightMm, params LabelElement[] elements) => new()
        {
            Dimensions = new LabelDimensions { WidthMm = widthMm, HeightMm = heightMm },
            Elements = elements.ToList(),
        };
    }
}
