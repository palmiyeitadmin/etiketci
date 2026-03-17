using System.ComponentModel.DataAnnotations;
using Plms.Api.Domain.Enums;

namespace Plms.Api.Domain.Entities
{
    public class TemplateRestorationRequest
    {
        public Guid Id { get; set; }

        public Guid TemplateId { get; set; }
        public LabelTemplate? Template { get; set; }

        public Guid TemplateVersionId { get; set; }
        public LabelTemplateVersion? TemplateVersion { get; set; }

        [Required]
        [MaxLength(2000)]
        public string BusinessJustification { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? TargetEnvironment { get; set; }

        public DateTime? RequestedUntil { get; set; }

        [Required]
        [MaxLength(150)]
        public string RequestedBy { get; set; } = string.Empty;

        public DateTime RequestedAt { get; set; }

        public RestorationRequestStatus Status { get; set; } = RestorationRequestStatus.Pending;

        [MaxLength(2000)]
        public string? ReviewComments { get; set; }

        [MaxLength(150)]
        public string? ReviewedBy { get; set; }

        public DateTime? ReviewedAt { get; set; }

        public Guid? RestoredVersionId { get; set; }
        public LabelTemplateVersion? RestoredVersion { get; set; }
    }
}
