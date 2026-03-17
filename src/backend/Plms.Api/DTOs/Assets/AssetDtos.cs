namespace Plms.Api.DTOs.Assets
{
    public class ContentAssetListItemDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Kind { get; set; } = string.Empty;
        public string MimeType { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long ByteSize { get; set; }
        public int? WidthPx { get; set; }
        public int? HeightPx { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class ContentAssetDetailDto : ContentAssetListItemDto
    {
        public string Sha256Hash { get; set; } = string.Empty;
        public string? UpdatedBy { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? TagsJson { get; set; }
    }

    public class CreateContentAssetResponseDto
    {
        public bool Deduplicated { get; set; }
        public ContentAssetDetailDto Asset { get; set; } = new();
    }
}
