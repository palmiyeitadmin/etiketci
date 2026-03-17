using Microsoft.AspNetCore.Identity;

namespace Plms.Api.Domain.Entities
{
    public class ApplicationRole : IdentityRole<Guid>
    {
        public string? Description { get; set; }
        public bool IsSystem { get; set; }
        public bool IsImmutable { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
