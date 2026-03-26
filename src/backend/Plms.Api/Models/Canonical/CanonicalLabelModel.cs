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
        public string Type { get; set; } = string.Empty; // 'text', 'rect', 'ellipse', 'line', 'image', 'barcode', 'qr'
        public string? Name { get; set; }
        public string? GroupId { get; set; }
        public string? GroupName { get; set; }
        public float XMm { get; set; }
        public float YMm { get; set; }
        public float WidthMm { get; set; }
        public float HeightMm { get; set; }
        public bool? Visible { get; set; }
        public bool? Locked { get; set; }
        public string Content { get; set; } = string.Empty;
        public float? Rotation { get; set; }
        public string? Font { get; set; }
        public float? FontSizePt { get; set; }
        public string? TextAlign { get; set; }
        public string? VerticalAlign { get; set; }
        public string? FontWeight { get; set; }
        public float? LineHeight { get; set; }
        public float? LetterSpacingPt { get; set; }
        public string? TextTransform { get; set; }
        public string? Fill { get; set; }
        public string? Stroke { get; set; }
        public float? StrokeWidthMm { get; set; }
        public string? BarcodeType { get; set; }
        public string? ImageFit { get; set; }
        public float? CornerRadiusMm { get; set; }
        public string? FrameFill { get; set; }
        public string? FrameStroke { get; set; }
        public float? FrameStrokeWidthMm { get; set; }
        public string? ImageAlignX { get; set; }
        public string? ImageAlignY { get; set; }
        public string? LineDirection { get; set; }
        public string? AssetId { get; set; }
        public string? AssetSource { get; set; }
        public string? AssetKey { get; set; }
    }
}
