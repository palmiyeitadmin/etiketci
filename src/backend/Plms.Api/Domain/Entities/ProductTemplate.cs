using System.ComponentModel.DataAnnotations;

namespace Plms.Api.Domain.Entities
{
    public class ProductTemplate
    {
        public Guid Id { get; set; }

        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public Guid TemplateId { get; set; }
        public LabelTemplate? Template { get; set; }

        public bool IsDefault { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }
    }
}
