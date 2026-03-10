using System.ComponentModel.DataAnnotations;

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
        public string Status { get; set; } = "Ready";

        [Required]
        [MaxLength(100)]
        public string RequestedBy { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        // Sprint 10 enrichment
        public string? ReadinessSnapshot { get; set; }
    }
}
