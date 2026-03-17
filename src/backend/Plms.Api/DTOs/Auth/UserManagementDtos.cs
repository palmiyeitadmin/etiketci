namespace Plms.Api.DTOs.Auth
{
    public class RoleAssignmentDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsSystem { get; set; }
        public bool IsImmutable { get; set; }
    }

    public class UserListItemDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool MustChangePassword { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? InvitedAt { get; set; }
        public string? InvitedBy { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public List<RoleAssignmentDto> Roles { get; set; } = new();
        public List<string> Permissions { get; set; } = new();
    }

    public class UserDetailDto : UserListItemDto
    {
    }

    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public List<Guid> RoleIds { get; set; } = new();
        public string Mode { get; set; } = "invite";
        public string? Password { get; set; }
        public bool MustChangePassword { get; set; } = true;
    }

    public class UpdateUserRequest
    {
        public string FullName { get; set; } = string.Empty;
        public List<Guid> RoleIds { get; set; } = new();
        public bool IsActive { get; set; }
    }

    public class ResetUserPasswordRequest
    {
        public string Mode { get; set; } = "invite-reset";
        public string? Password { get; set; }
    }
}
