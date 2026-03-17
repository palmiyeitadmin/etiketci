using System.ComponentModel.DataAnnotations;

namespace Plms.Api.Domain.Entities
{
    public class RolePermission
    {
        public Guid Id { get; set; }

        public Guid RoleId { get; set; }
        public ApplicationRole? Role { get; set; }

        [MaxLength(150)]
        public string PermissionKey { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(150)]
        public string CreatedBy { get; set; } = "System";
    }
}
