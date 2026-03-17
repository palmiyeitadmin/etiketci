using Microsoft.AspNetCore.Identity;

namespace Plms.Api.Domain.Entities
{
    public class ApplicationUser : IdentityUser<Guid>
    {
        public string FullName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
        public bool MustChangePassword { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public DateTime? InvitedAt { get; set; }
        public string? InvitedBy { get; set; }
    }
}
