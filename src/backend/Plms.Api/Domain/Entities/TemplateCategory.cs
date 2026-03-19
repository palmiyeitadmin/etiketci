using System.ComponentModel.DataAnnotations;

namespace Plms.Api.Domain.Entities
{
    public class TemplateCategory
    {
        public Guid Id { get; set; }

        [Required]
        [MaxLength(20)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public int NextTemplateSequence { get; set; } = 1;

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ICollection<LabelTemplate> Templates { get; set; } = new List<LabelTemplate>();
    }
}
