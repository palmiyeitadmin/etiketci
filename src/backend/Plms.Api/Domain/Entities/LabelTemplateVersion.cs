using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Plms.Api.Domain.Enums;

namespace Plms.Api.Domain.Entities
{
    public class LabelTemplateVersion
    {
        public Guid Id { get; set; }

        public Guid TemplateId { get; set; }
        public LabelTemplate? Template { get; set; }

        public int VersionNumber { get; set; }

        public TemplateStatus Status { get; set; } = TemplateStatus.Draft;

        [Required]
        [Column(TypeName = "jsonb")]
        public string LayoutJson { get; set; } = "{}";

        public string? ChangeNotes { get; set; }

        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; } = "System";
    }
}
