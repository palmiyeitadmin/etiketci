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
    }
}
