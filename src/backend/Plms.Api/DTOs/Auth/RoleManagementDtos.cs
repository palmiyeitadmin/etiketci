namespace Plms.Api.DTOs.Auth
{
    public class PermissionCatalogGroupDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public List<PermissionCatalogItemDto> Items { get; set; } = new();
    }

    public class PermissionCatalogItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class RoleListItemDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsSystem { get; set; }
        public bool IsImmutable { get; set; }
        public int AssignedUserCount { get; set; }
        public List<string> PermissionKeys { get; set; } = new();
    }

    public class RoleDetailDto : RoleListItemDto
    {
    }

    public class CreateRoleRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<string> PermissionKeys { get; set; } = new();
    }

    public class UpdateRoleRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<string> PermissionKeys { get; set; } = new();
    }
}
