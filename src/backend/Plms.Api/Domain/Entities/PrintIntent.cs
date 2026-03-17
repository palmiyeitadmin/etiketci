using System.ComponentModel.DataAnnotations;
using Plms.Api.Domain.Enums;

namespace Plms.Api.Domain.Entities
{
    public class PrintIntent
    {
        public Guid Id { get; set; }

        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public Guid TemplateId { get; set; }
        public LabelTemplate? Template { get; set; }

        public Guid VersionId { get; set; }
        public LabelTemplateVersion? Version { get; set; }

        public int Quantity { get; set; } = 1;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        [Required]
        [MaxLength(100)]
        public string RequestedBy { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        // Sprint 10 enrichment
        public string? ReadinessSnapshot { get; set; }

        // Sprint 11 enrichment
        public DateTime? OperatorReviewedAt { get; set; }
        
        [MaxLength(100)]
        public string? OperatorReviewedBy { get; set; }

        public DateTime? DispatchedAt { get; set; }

        [MaxLength(100)]
        public string? DispatchedBy { get; set; }

        public DateTime? CompletedAt { get; set; }

        [MaxLength(100)]
        public string? CompletedBy { get; set; }

        [MaxLength(1000)]
        public string? FailureReason { get; set; }

        public TemplateStatus? SourceVersionStatus { get; set; }
    }
}
