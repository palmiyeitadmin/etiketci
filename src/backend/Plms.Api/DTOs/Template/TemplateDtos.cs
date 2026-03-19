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
        public DateTime? SubmittedForReviewAt { get; set; }
        public string? SubmittedForReviewBy { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public string? ReviewDecision { get; set; }
        public string? ReviewComment { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string? PublishedBy { get; set; }
        public Guid? SourceVersionId { get; set; }
    }

    public class ApprovalSummaryDto
    {
        public Guid TemplateId { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public string TemplateCode { get; set; } = string.Empty;
        public Guid VersionId { get; set; }
        public int VersionNumber { get; set; }
        public DateTime RequestedAt { get; set; }
        public string RequestedBy { get; set; } = string.Empty;
        public string? ChangeNotes { get; set; }
        public string? ReviewCommentSummary { get; set; }
    }

    public class TemplateDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public string? ArchivedBy { get; set; }
        public Guid TemplateCategoryId { get; set; }
        public string TemplateCategoryCode { get; set; } = string.Empty;
        public string TemplateCategoryName { get; set; } = string.Empty;
        public Guid? CurrentActiveVersionId { get; set; }
        public TemplateVersionDto? CurrentActiveVersion { get; set; }
        public TemplateVersionDto? LatestVersion { get; set; }
        public int LinkedProductCount { get; set; }
        public int DraftCount { get; set; }
        public int InReviewCount { get; set; }
        public int PublishedCount { get; set; }
        public string? LastUpdatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<TemplateVersionDto> Versions { get; set; } = new();
    }

    public class CreateTemplateDto
    {
        public string Name { get; set; } = string.Empty;
        public Guid TemplateCategoryId { get; set; }
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

    public class TemplatePreviewDto
    {
        public Guid TemplateId { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public string TemplateCode { get; set; } = string.Empty;
        public Guid VersionId { get; set; }
        public int VersionNumber { get; set; }
        public TemplateStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime? SubmittedForReviewAt { get; set; }
        public string? SubmittedForReviewBy { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string? PublishedBy { get; set; }
        public List<string> Warnings { get; set; } = new();
        public List<string> RequiredVariables { get; set; } = new();
        public bool HasProductContext { get; set; }
        public string? ProductName { get; set; }
        public string? ProductSku { get; set; }
        
        // Sprint 10 additions
        public Plms.Api.Models.Operational.ReadinessStatus ReadinessStatus { get; set; }
        public List<string> ReadinessErrors { get; set; } = new();
        public List<Plms.Api.Models.Operational.VariableResolutionDetail> VariableDetails { get; set; } = new();
    }

    public class ReviewTemplateVersionDto
    {
        public bool Approve { get; set; }
        public string? Comments { get; set; }
    }

    public class TemplateComparisonDto
    {
        public Guid TemplateId { get; set; }
        public Guid LeftVersionId { get; set; }
        public Guid RightVersionId { get; set; }
        public int LeftVersionNumber { get; set; }
        public int RightVersionNumber { get; set; }
        public List<TemplateComparisonElementChangeDto> AddedElements { get; set; } = new();
        public List<TemplateComparisonElementChangeDto> RemovedElements { get; set; } = new();
        public List<TemplateComparisonElementChangeDto> ChangedElements { get; set; } = new();
    }

    public class TemplateComparisonElementChangeDto
    {
        public string ElementId { get; set; } = string.Empty;
        public string ElementType { get; set; } = string.Empty;
        public string ChangeType { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
    }

    public class CreateTemplateRestorationRequestDto
    {
        public string BusinessJustification { get; set; } = string.Empty;
        public string? TargetEnvironment { get; set; }
        public DateTime? RequestedUntil { get; set; }
    }

    public class RestorationApprovalReviewDto
    {
        public bool Approve { get; set; }
        public string? Comments { get; set; }
    }

    public class TemplateRestorationRequestDto
    {
        public Guid Id { get; set; }
        public Guid TemplateId { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public string TemplateCode { get; set; } = string.Empty;
        public Guid TemplateVersionId { get; set; }
        public int TemplateVersionNumber { get; set; }
        public TemplateStatus TemplateVersionStatus { get; set; }
        public string BusinessJustification { get; set; } = string.Empty;
        public string? TargetEnvironment { get; set; }
        public DateTime? RequestedUntil { get; set; }
        public string RequestedBy { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReviewComments { get; set; }
        public string? ReviewedBy { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public Guid? RestoredVersionId { get; set; }
    }

    public class VariableCatalogItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string SampleValue { get; set; } = string.Empty;
        public List<string> SupportedElementTypes { get; set; } = new();
    }

    public class VariableCatalogResponseDto
    {
        public List<VariableCatalogItemDto> Items { get; set; } = new();
    }
}
