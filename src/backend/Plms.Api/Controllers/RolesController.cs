using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.DTOs.Auth;
using Plms.Api.Security;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RolesController : ControllerBase
    {
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly ApplicationDbContext _context;

        public RolesController(RoleManager<ApplicationRole> roleManager, ApplicationDbContext context)
        {
            _roleManager = roleManager;
            _context = context;
        }

        [HttpGet]
        [HasPermission(Permissions.RolesView)]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _context.Roles.OrderBy(role => role.Name).ToListAsync();
            var items = await MapRolesAsync(roles);
            return Ok(new { success = true, data = items });
        }

        [HttpGet("{id:guid}")]
        [HasPermission(Permissions.RolesView)]
        public async Task<IActionResult> GetRole(Guid id)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(item => item.Id == id);
            if (role == null)
            {
                return NotFound(new { success = false, error = "Role not found." });
            }

            return Ok(new { success = true, data = await MapRoleAsync(role) });
        }

        [HttpPost]
        [HasPermission(Permissions.RolesCreate)]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { success = false, error = "Role name is required." });
            }

            if (await _roleManager.RoleExistsAsync(request.Name.Trim()))
            {
                return BadRequest(new { success = false, error = "Role name already exists." });
            }

            var invalidPermissions = request.PermissionKeys.Where(permission => !PermissionCatalog.AllPermissionKeys.Contains(permission)).Distinct().ToList();
            if (invalidPermissions.Count > 0)
            {
                return BadRequest(new { success = false, error = $"Unknown permissions: {string.Join(", ", invalidPermissions)}" });
            }

            var role = new ApplicationRole
            {
                Name = request.Name.Trim(),
                NormalizedName = request.Name.Trim().ToUpperInvariant(),
                Description = request.Description?.Trim(),
                IsSystem = false,
                IsImmutable = false,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _roleManager.CreateAsync(role);
            if (!result.Succeeded)
            {
                return BadRequest(new { success = false, errors = result.Errors.Select(error => error.Description) });
            }

            await ReplacePermissionsAsync(role.Id, request.PermissionKeys);
            await WriteAuditAsync("RoleCreated", role.Id.ToString(), $"Role {role.Name} created with permissions: {string.Join(", ", request.PermissionKeys)}.");

            return Ok(new { success = true, data = await MapRoleAsync(role) });
        }

        [HttpPut("{id:guid}")]
        [HasPermission(Permissions.RolesEdit)]
        public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(item => item.Id == id);
            if (role == null)
            {
                return NotFound(new { success = false, error = "Role not found." });
            }

            if (role.IsImmutable)
            {
                return BadRequest(new { success = false, error = "This role is immutable and cannot be edited." });
            }

            var trimmedName = request.Name.Trim();
            if (string.IsNullOrWhiteSpace(trimmedName))
            {
                return BadRequest(new { success = false, error = "Role name is required." });
            }

            if (role.IsSystem && !string.Equals(role.Name, trimmedName, StringComparison.Ordinal))
            {
                return BadRequest(new { success = false, error = "System role names cannot be changed." });
            }

            var nameConflict = await _context.Roles.AnyAsync(item => item.Id != id && item.NormalizedName == trimmedName.ToUpperInvariant());
            if (nameConflict)
            {
                return BadRequest(new { success = false, error = "Role name already exists." });
            }

            var invalidPermissions = request.PermissionKeys.Where(permission => !PermissionCatalog.AllPermissionKeys.Contains(permission)).Distinct().ToList();
            if (invalidPermissions.Count > 0)
            {
                return BadRequest(new { success = false, error = $"Unknown permissions: {string.Join(", ", invalidPermissions)}" });
            }

            var oldPermissions = await _context.RolePermissions.Where(item => item.RoleId == role.Id).Select(item => item.PermissionKey).OrderBy(item => item).ToListAsync();

            role.Name = trimmedName;
            role.NormalizedName = trimmedName.ToUpperInvariant();
            role.Description = request.Description?.Trim();
            await _roleManager.UpdateAsync(role);
            await ReplacePermissionsAsync(role.Id, request.PermissionKeys);

            await WriteAuditAsync(
                "RoleUpdated",
                role.Id.ToString(),
                $"Role {role.Name} updated. Permissions: [{string.Join(", ", oldPermissions)}] -> [{string.Join(", ", request.PermissionKeys.OrderBy(item => item))}].");

            return Ok(new { success = true, data = await MapRoleAsync(role) });
        }

        [HttpDelete("{id:guid}")]
        [HasPermission(Permissions.RolesDelete)]
        public async Task<IActionResult> DeleteRole(Guid id)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(item => item.Id == id);
            if (role == null)
            {
                return NotFound(new { success = false, error = "Role not found." });
            }

            if (role.IsSystem)
            {
                return BadRequest(new { success = false, error = "System roles cannot be deleted." });
            }

            var assignedUserCount = await _context.UserRoles.CountAsync(userRole => userRole.RoleId == role.Id);
            if (assignedUserCount > 0)
            {
                return Conflict(new { success = false, error = "Role cannot be deleted while users are assigned to it." });
            }

            var permissions = await _context.RolePermissions.Where(item => item.RoleId == role.Id).ToListAsync();
            if (permissions.Count > 0)
            {
                _context.RolePermissions.RemoveRange(permissions);
                await _context.SaveChangesAsync();
            }

            await _roleManager.DeleteAsync(role);
            await WriteAuditAsync("RoleDeleted", role.Id.ToString(), $"Role {role.Name} deleted.");

            return Ok(new { success = true });
        }

        private async Task ReplacePermissionsAsync(Guid roleId, IEnumerable<string> requestedPermissions)
        {
            var normalizedPermissions = requestedPermissions.Distinct(StringComparer.OrdinalIgnoreCase).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var existing = await _context.RolePermissions.Where(item => item.RoleId == roleId).ToListAsync();

            var toRemove = existing.Where(item => !normalizedPermissions.Contains(item.PermissionKey)).ToList();
            if (toRemove.Count > 0)
            {
                _context.RolePermissions.RemoveRange(toRemove);
            }

            var existingKeys = existing.Select(item => item.PermissionKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var permission in normalizedPermissions.Where(permission => !existingKeys.Contains(permission)))
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = roleId,
                    PermissionKey = permission,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = User.Identity?.Name ?? "System"
                });
            }

            await _context.SaveChangesAsync();
        }

        private async Task<List<RoleListItemDto>> MapRolesAsync(List<ApplicationRole> roles)
        {
            var roleIds = roles.Select(role => role.Id).ToList();
            var permissionMap = await _context.RolePermissions
                .Where(item => roleIds.Contains(item.RoleId))
                .GroupBy(item => item.RoleId)
                .ToDictionaryAsync(group => group.Key, group => group.Select(item => item.PermissionKey).OrderBy(item => item).ToList());

            var userCountMap = await _context.UserRoles
                .Where(item => roleIds.Contains(item.RoleId))
                .GroupBy(item => item.RoleId)
                .ToDictionaryAsync(group => group.Key, group => group.Count());

            return roles.Select(role => new RoleListItemDto
            {
                Id = role.Id,
                Name = role.Name ?? string.Empty,
                Description = role.Description,
                IsSystem = role.IsSystem,
                IsImmutable = role.IsImmutable,
                AssignedUserCount = userCountMap.GetValueOrDefault(role.Id, 0),
                PermissionKeys = permissionMap.GetValueOrDefault(role.Id, new List<string>())
            }).ToList();
        }

        private async Task<RoleDetailDto> MapRoleAsync(ApplicationRole role)
        {
            var permissionKeys = await _context.RolePermissions
                .Where(item => item.RoleId == role.Id)
                .Select(item => item.PermissionKey)
                .OrderBy(item => item)
                .ToListAsync();

            var assignedUserCount = await _context.UserRoles.CountAsync(userRole => userRole.RoleId == role.Id);

            return new RoleDetailDto
            {
                Id = role.Id,
                Name = role.Name ?? string.Empty,
                Description = role.Description,
                IsSystem = role.IsSystem,
                IsImmutable = role.IsImmutable,
                AssignedUserCount = assignedUserCount,
                PermissionKeys = permissionKeys
            };
        }

        private async Task WriteAuditAsync(string action, string entityId, string details)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = action,
                EntityId = entityId,
                EntityType = "Role",
                UserId = User.Identity?.Name ?? "System",
                Details = details,
                CorrelationId = HttpContext.TraceIdentifier
            });
            await _context.SaveChangesAsync();
        }
    }
}
