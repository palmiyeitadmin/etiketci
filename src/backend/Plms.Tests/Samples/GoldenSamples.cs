using System.Collections.Generic;
using Plms.Api.Models.Canonical;

namespace Plms.Tests.Samples
{
    public static class GoldenSamples
    {
        public static CanonicalLabelModel TextOnlyLabel => new()
        {
            Name = "Text Only Sample",
            Dimensions = new LabelDimensions { WidthMm = 100, HeightMm = 50 },
            Elements = new List<LabelElement>
            {
                new LabelElement { Id = "t1", Type = "text", Content = "Title Text", XMm = 10, YMm = 10, WidthMm = 80, HeightMm = 10, FontSizePt = 18 },
                new LabelElement { Id = "t2", Type = "text", Content = "Supporting text goes here", XMm = 10, YMm = 25, WidthMm = 80, HeightMm = 8, FontSizePt = 10 }
            }
        };

        public static CanonicalLabelModel BarcodeLabel => new()
        {
            Name = "Barcode Sample",
            Dimensions = new LabelDimensions { WidthMm = 100, HeightMm = 50 },
            Elements = new List<LabelElement>
            {
                new LabelElement { Id = "b1", Type = "barcode", BarcodeType = "CODE_128", Content = "PLMS-12345", XMm = 10, YMm = 10, WidthMm = 80, HeightMm = 30 }
            }
        };

        public static CanonicalLabelModel QrCodeLabel => new()
        {
            Name = "QR Sample",
            Dimensions = new LabelDimensions { WidthMm = 50, HeightMm = 50 },
            Elements = new List<LabelElement>
            {
                new LabelElement { Id = "q1", Type = "qr", Content = "https://palmiyeit.com", XMm = 5, YMm = 5, WidthMm = 40, HeightMm = 40 }
            }
        };

        public static CanonicalLabelModel MixedLabel => new()
        {
            Name = "Mixed Elements Sample",
            Dimensions = new LabelDimensions { WidthMm = 100, HeightMm = 100 },
            Elements = new List<LabelElement>
            {
                new LabelElement { Id = "m1", Type = "rect", XMm = 0, YMm = 0, WidthMm = 100, HeightMm = 100, Stroke = "#000000", StrokeWidthMm = 0.5f },
                new LabelElement { Id = "m2", Type = "text", Content = "PRODUCT LABEL", XMm = 5, YMm = 5, WidthMm = 90, HeightMm = 10, FontSizePt = 20, Font = "Arial" },
                new LabelElement { Id = "m3", Type = "barcode", BarcodeType = "CODE_128", Content = "SKU-998-11", XMm = 5, YMm = 20, WidthMm = 90, HeightMm = 25 },
                new LabelElement { Id = "m4", Type = "qr", Content = "P-998", XMm = 70, YMm = 50, WidthMm = 25, HeightMm = 25 },
                new LabelElement { Id = "m5", Type = "text", Content = "Price: $99.00", XMm = 5, YMm = 80, WidthMm = 60, HeightMm = 10, FontSizePt = 14 }
            }
        };
    }
}
