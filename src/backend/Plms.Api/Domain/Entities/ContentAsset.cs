namespace Plms.Api.Domain.Entities
{
    public class ContentAsset
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Kind { get; set; } = "UploadedImage";
        public string MimeType { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long ByteSize { get; set; }
        public string Sha256Hash { get; set; } = string.Empty;
        public int? WidthPx { get; set; }
        public int? HeightPx { get; set; }
        public string? TagsJson { get; set; }
        public byte[] StorageData { get; set; } = [];
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string? UpdatedBy { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
