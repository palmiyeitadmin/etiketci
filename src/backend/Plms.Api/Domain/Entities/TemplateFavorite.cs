namespace Plms.Api.Domain.Entities
{
    public class TemplateFavorite
    {
        public Guid Id { get; set; }
        public Guid TemplateId { get; set; }
        public LabelTemplate? Template { get; set; }
        public Guid UserId { get; set; }
        public ApplicationUser? User { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
