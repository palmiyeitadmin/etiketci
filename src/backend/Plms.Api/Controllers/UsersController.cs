using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.DTOs.Auth;
using Plms.Api.Security;
using Plms.Api.Services;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly ApplicationDbContext _context;
        private readonly IPermissionService _permissionService;

        public UsersController(
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            ApplicationDbContext context,
            IPermissionService permissionService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _context = context;
            _permissionService = permissionService;
        }

        [HttpGet]
        [HasPermission(Permissions.UsersView)]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userManager.Users.OrderBy(user => user.Email).ToListAsync();
            var items = new List<UserListItemDto>();

            foreach (var user in users)
            {
                items.Add(await MapUserAsync(user));
            }

            return Ok(new { success = true, data = items });
        }

        [HttpGet("{id:guid}")]
        [HasPermission(Permissions.UsersView)]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user == null)
            {
                return NotFound(new { success = false, error = "User not found." });
            }

            return Ok(new { success = true, data = await MapUserAsync(user) });
        }

        [HttpPost]
        [HasPermission(Permissions.UsersCreate)]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            if (!request.RoleIds.Any())
            {
                return BadRequest(new { success = false, error = "At least one role must be assigned." });
            }

            var roles = await _context.Roles.Where(role => request.RoleIds.Contains(role.Id)).ToListAsync();
            if (roles.Count != request.RoleIds.Distinct().Count())
            {
                return BadRequest(new { success = false, error = "One or more selected roles do not exist." });
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest(new { success = false, error = "A user with this email already exists." });
            }

            var mode = request.Mode.Trim().ToLowerInvariant();
            if (mode != "invite" && mode != "direct")
            {
                return BadRequest(new { success = false, error = "Invalid onboarding mode." });
            }

            if (mode == "direct" && string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { success = false, error = "Password is required for direct onboarding." });
            }

            var actor = User.Identity?.Name ?? "System";
            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FullName = request.FullName,
                CreatedAt = DateTime.UtcNow,
                InvitedAt = DateTime.UtcNow,
                InvitedBy = actor,
                IsActive = mode == "direct",
                EmailConfirmed = mode == "direct",
                MustChangePassword = mode == "direct" ? request.MustChangePassword : true
            };

            IdentityResult result;
            if (mode == "direct")
            {
                result = await _userManager.CreateAsync(user, request.Password!);
            }
            else
            {
                result = await _userManager.CreateAsync(user);
            }

            if (!result.Succeeded)
            {
                return BadRequest(new { success = false, errors = result.Errors.Select(error => error.Description) });
            }

            var roleNames = roles.Select(role => role.Name!).ToArray();
            var addRolesResult = await _userManager.AddToRolesAsync(user, roleNames);
            if (!addRolesResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);
                return BadRequest(new { success = false, errors = addRolesResult.Errors.Select(error => error.Description) });
            }

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "UserCreated",
                EntityId = user.Id.ToString(),
                EntityType = "User",
                UserId = actor,
                Details = $"User {user.Email} created with roles: {string.Join(", ", roleNames)}. Mode: {mode}.",
                CorrelationId = HttpContext.TraceIdentifier
            });
            await _context.SaveChangesAsync();

            if (mode == "invite")
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var setupLink = $"/auth/setup-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";
                return Ok(new { success = true, data = new { id = user.Id, setupLink } });
            }

            return Ok(new { success = true, data = new { id = user.Id } });
        }

        [HttpPut("{id:guid}")]
        [HasPermission(Permissions.UsersEdit)]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user == null)
            {
                return NotFound(new { success = false, error = "User not found." });
            }

            if (!request.RoleIds.Any())
            {
                return BadRequest(new { success = false, error = "At least one role must be assigned." });
            }

            var roles = await _context.Roles.Where(role => request.RoleIds.Contains(role.Id)).ToListAsync();
            if (roles.Count != request.RoleIds.Distinct().Count())
            {
                return BadRequest(new { success = false, error = "One or more selected roles do not exist." });
            }

            var currentRoles = await _userManager.GetRolesAsync(user);
            var currentAdmin = currentRoles.Contains(ApplicationRoles.Admin);
            var willRemainAdmin = roles.Any(role => role.Name == ApplicationRoles.Admin);
            if (currentAdmin && (!willRemainAdmin || !request.IsActive))
            {
                var otherActiveAdmins = await CountOtherActiveAdminsAsync(user.Id);
                if (otherActiveAdmins == 0)
                {
                    return BadRequest(new { success = false, error = "The last active admin cannot be deactivated or stripped of Admin role." });
                }
            }

            user.FullName = request.FullName.Trim();
            user.IsActive = request.IsActive;
            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return BadRequest(new { success = false, errors = updateResult.Errors.Select(error => error.Description) });
            }

            var requestedRoleNames = roles.Select(role => role.Name!).ToList();
            var removeRoles = currentRoles.Where(role => !requestedRoleNames.Contains(role)).ToList();
            var addRoles = requestedRoleNames.Where(role => !currentRoles.Contains(role)).ToList();

            if (removeRoles.Count > 0)
            {
                var removeResult = await _userManager.RemoveFromRolesAsync(user, removeRoles);
                if (!removeResult.Succeeded)
                {
                    return BadRequest(new { success = false, errors = removeResult.Errors.Select(error => error.Description) });
                }
            }

            if (addRoles.Count > 0)
            {
                var addResult = await _userManager.AddToRolesAsync(user, addRoles);
                if (!addResult.Succeeded)
                {
                    return BadRequest(new { success = false, errors = addResult.Errors.Select(error => error.Description) });
                }
            }

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "UserUpdated",
                EntityId = user.Id.ToString(),
                EntityType = "User",
                UserId = User.Identity?.Name ?? "System",
                Details = $"User updated. Roles: [{string.Join(", ", currentRoles)}] -> [{string.Join(", ", requestedRoleNames)}], Active: {user.IsActive}.",
                CorrelationId = HttpContext.TraceIdentifier
            });
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = await MapUserAsync(user) });
        }

        [HttpPost("{id:guid}/activate")]
        [HasPermission(Permissions.UsersActivate)]
        public Task<IActionResult> ActivateUser(Guid id) => SetUserActiveAsync(id, true);

        [HttpPost("{id:guid}/deactivate")]
        [HasPermission(Permissions.UsersActivate)]
        public Task<IActionResult> DeactivateUser(Guid id) => SetUserActiveAsync(id, false);

        [HttpPost("{id:guid}/reset-password")]
        [HasPermission(Permissions.UsersResetPassword)]
        public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetUserPasswordRequest request)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user == null)
            {
                return NotFound(new { success = false, error = "User not found." });
            }

            var mode = request.Mode.Trim().ToLowerInvariant();
            if (mode == "invite-reset")
            {
                user.IsActive = false;
                user.MustChangePassword = true;
                await _userManager.UpdateAsync(user);

                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                _context.AuditLogs.Add(new AuditLog
                {
                    Id = Guid.NewGuid(),
                    Timestamp = DateTime.UtcNow,
                    Action = "UserPasswordResetIssued",
                    EntityId = user.Id.ToString(),
                    EntityType = "User",
                    UserId = User.Identity?.Name ?? "System",
                    Details = $"Setup/reset link issued for {user.Email}.",
                    CorrelationId = HttpContext.TraceIdentifier
                });
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        setupLink = $"/auth/setup-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}"
                    }
                });
            }

            if (mode != "admin-set-temp-password" || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { success = false, error = "A temporary password is required for admin-set-temp-password mode." });
            }

            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await _userManager.ResetPasswordAsync(user, resetToken, request.Password);
            if (!resetResult.Succeeded)
            {
                return BadRequest(new { success = false, errors = resetResult.Errors.Select(error => error.Description) });
            }

            user.IsActive = true;
            user.EmailConfirmed = true;
            user.MustChangePassword = true;
            await _userManager.UpdateAsync(user);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "UserTemporaryPasswordIssued",
                EntityId = user.Id.ToString(),
                EntityType = "User",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Temporary password issued for {user.Email}.",
                CorrelationId = HttpContext.TraceIdentifier
            });
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("{id:guid}/resend-setup")]
        [HasPermission(Permissions.UsersResetPassword)]
        public async Task<IActionResult> ResendSetup(Guid id)
        {
            return await ResetPassword(id, new ResetUserPasswordRequest { Mode = "invite-reset" });
        }

        private async Task<IActionResult> SetUserActiveAsync(Guid id, bool active)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user == null)
            {
                return NotFound(new { success = false, error = "User not found." });
            }

            var roles = await _userManager.GetRolesAsync(user);
            if (!active && roles.Contains(ApplicationRoles.Admin))
            {
                var otherActiveAdmins = await CountOtherActiveAdminsAsync(user.Id);
                if (otherActiveAdmins == 0)
                {
                    return BadRequest(new { success = false, error = "The last active admin cannot be deactivated." });
                }
            }

            user.IsActive = active;
            await _userManager.UpdateAsync(user);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = active ? "UserActivated" : "UserDeactivated",
                EntityId = user.Id.ToString(),
                EntityType = "User",
                UserId = User.Identity?.Name ?? "System",
                Details = $"User {user.Email} active state changed to {active}.",
                CorrelationId = HttpContext.TraceIdentifier
            });
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = await MapUserAsync(user) });
        }

        private async Task<int> CountOtherActiveAdminsAsync(Guid excludedUserId)
        {
            var adminRole = await _roleManager.FindByNameAsync(ApplicationRoles.Admin);
            if (adminRole == null)
            {
                return 0;
            }

            return await (from userRole in _context.UserRoles
                          join user in _context.Users on userRole.UserId equals user.Id
                          where userRole.RoleId == adminRole.Id && user.Id != excludedUserId && user.IsActive
                          select user.Id)
                .Distinct()
                .CountAsync();
        }

        private async Task<UserDetailDto> MapUserAsync(ApplicationUser user)
        {
            var assignedRoles = await (from userRole in _context.UserRoles
                                       join role in _context.Roles on userRole.RoleId equals role.Id
                                       where userRole.UserId == user.Id
                                       orderby role.Name
                                       select new RoleAssignmentDto
                                       {
                                           Id = role.Id,
                                           Name = role.Name ?? string.Empty,
                                           Description = role.Description,
                                           IsSystem = role.IsSystem,
                                           IsImmutable = role.IsImmutable
                                       }).ToListAsync();

            var permissions = await _permissionService.GetPermissionsForUserAsync(user);

            return new UserDetailDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                IsActive = user.IsActive,
                MustChangePassword = user.MustChangePassword,
                CreatedAt = user.CreatedAt,
                InvitedAt = user.InvitedAt,
                InvitedBy = user.InvitedBy,
                LastLoginAt = user.LastLoginAt,
                Roles = assignedRoles,
                Permissions = permissions
            };
        }
    }
}
