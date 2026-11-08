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

        // Phase 2: what was printed, and reprints.

        /// <summary>
        /// The label exactly as printed: the version layout with every variable resolved from the product
        /// at dispatch time (CanonicalLabelModel JSON). The print PDF is always rendered from this, so a later
        /// change to the product does not change what this request prints.
        /// </summary>
        public string? PrintedPayload { get; set; }

        /// <summary>SHA-256 of <see cref="PrintedPayload"/>; equal hashes mean identical labels.</summary>
        [MaxLength(64)]
        public string? PayloadSha256 { get; set; }

        public Guid? ReprintOfId { get; set; }
        public PrintIntent? ReprintOf { get; set; }

        [MaxLength(30)]
        public string? ReprintReason { get; set; }

        [MaxLength(500)]
        public string? ReprintNote { get; set; }

        [MaxLength(30)]
        public string? FailureCategory { get; set; }

        /// <summary>How many labels actually came out (all on success; reported by the operator on failure).</summary>
        public int? PrintedQuantity { get; set; }

        /// <summary>Where the request came from: "station" (print station) or null (request queue).</summary>
        [MaxLength(20)]
        public string? Channel { get; set; }
    }
}
