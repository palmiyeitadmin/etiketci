using System.Collections.Generic;

namespace Plms.Api.Models.Canonical
{
    public class CanonicalLabelModel
    {
        public string Version { get; set; } = "1.0";
        public string Name { get; set; } = string.Empty;
        public LabelDimensions Dimensions { get; set; } = new();
        public List<LabelElement> Elements { get; set; } = new();
    }

    public class LabelDimensions
    {
        public float WidthMm { get; set; }
        public float HeightMm { get; set; }
    }

    public class LabelElement
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // 'text', 'rect', 'line', 'image', 'barcode', 'qr'
        public float XMm { get; set; }
        public float YMm { get; set; }
        public float WidthMm { get; set; }
        public float HeightMm { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? Font { get; set; }
        public float? FontSizePt { get; set; }
        public string? Fill { get; set; }
        public string? Stroke { get; set; }
        public float? StrokeWidthMm { get; set; }
        public string? BarcodeType { get; set; }
    }
}
