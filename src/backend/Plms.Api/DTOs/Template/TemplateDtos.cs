using Plms.Api.Domain.Enums;

namespace Plms.Api.DTOs.Template
{
    public class TemplateVersionDto
    {
        public Guid Id { get; set; }
        public int VersionNumber { get; set; }
        public TemplateStatus Status { get; set; }
        public string LayoutJson { get; set; } = "{}";
        public string? ChangeNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class TemplateDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public Guid? CurrentActiveVersionId { get; set; }
        public TemplateVersionDto? CurrentActiveVersion { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateTemplateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string InitialLayoutJson { get; set; } = "{}";
    }

    public class UpdateTemplateDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class UpdateTemplateVersionDto
    {
        public string LayoutJson { get; set; } = "{}";
        public string? ChangeNotes { get; set; }
    }
}
