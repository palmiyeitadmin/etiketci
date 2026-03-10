using System.ComponentModel.DataAnnotations;

namespace Plms.Api.Domain.Entities
{
    public class LabelTemplate
    {
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Guid? CurrentActiveVersionId { get; set; }
        public LabelTemplateVersion? CurrentActiveVersion { get; set; }

        public ICollection<LabelTemplateVersion> Versions { get; set; } = new List<LabelTemplateVersion>();
    }
}
