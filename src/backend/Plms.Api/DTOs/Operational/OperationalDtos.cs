using Plms.Api.Domain.Enums;

namespace Plms.Api.DTOs.Operational
{
    public class LinkTemplateDto
    {
        public Guid TemplateId { get; set; }
        public bool IsDefault { get; set; }
    }

    public class ProductTemplateDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public Guid TemplateId { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public string TemplateCode { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }

        /// <summary>The template's published version, if any (only published versions can be printed).</summary>
        public Guid? PublishedVersionId { get; set; }
        public int? PublishedVersionNumber { get; set; }
        public float? WidthMm { get; set; }
        public float? HeightMm { get; set; }
    }

    public class CreatePrintIntentDto
    {
        public Guid ProductId { get; set; }
        public Guid TemplateId { get; set; }
        public Guid VersionId { get; set; }
        public int Quantity { get; set; }
    }

    public class PrintIntentDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public Guid TemplateId { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public Guid VersionId { get; set; }
        public int VersionNumber { get; set; }
        public int Quantity { get; set; }
        public string Status { get; set; } = string.Empty;
        public string RequestedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? ReadinessSnapshot { get; set; }
        
        public DateTime? OperatorReviewedAt { get; set; }
        public string? OperatorReviewedBy { get; set; }
        public DateTime? DispatchedAt { get; set; }
        public string? DispatchedBy { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? CompletedBy { get; set; }
        public string? FailureReason { get; set; }
        public TemplateStatus? SourceVersionStatus { get; set; }

        public string ProductSku { get; set; } = string.Empty;
        public string TemplateCode { get; set; } = string.Empty;
        public bool HasPrintedPayload { get; set; }
        public Guid? ReprintOfId { get; set; }
        public string? ReprintReason { get; set; }
        public string? ReprintNote { get; set; }
        public string? FailureCategory { get; set; }
        public int? PrintedQuantity { get; set; }
        public string? Channel { get; set; }
    }

    public class PrintIntentDetailDto : PrintIntentDto
    {
        public Plms.Api.Services.FinalSafetyCheckResult? SafetyCheck { get; set; }

        /// <summary>Reprints made from this request, newest first.</summary>
        public List<PrintIntentReprintDto> Reprints { get; set; } = new();
    }

    public class PrintIntentReprintDto
    {
        public Guid Id { get; set; }
        public int Quantity { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReprintReason { get; set; }
        public string RequestedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class MarkPrintIntentFailedDto
    {
        /// <summary>One of <see cref="Plms.Api.Domain.Enums.PrintFailureCategories"/>.</summary>
        public string? Category { get; set; }

        /// <summary>Free text; required when the category is "other".</summary>
        public string? Reason { get; set; }

        /// <summary>Labels that did come out, if any (0..quantity).</summary>
        public int? PrintedQuantity { get; set; }
    }

    public class QuickPrintDto
    {
        public Guid ProductId { get; set; }
        public Guid TemplateId { get; set; }
        public int Quantity { get; set; }
    }

    public class ReprintDto
    {
        /// <summary>One of <see cref="Plms.Api.Domain.Enums.ReprintReasons"/>.</summary>
        public string? Reason { get; set; }
        public string? Note { get; set; }
        public int Quantity { get; set; }
    }

    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class AuditLogDto
    {
        public Guid Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Action { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string CorrelationId { get; set; } = string.Empty;
    }
}
