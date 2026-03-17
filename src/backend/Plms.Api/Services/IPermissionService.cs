using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Security;

namespace Plms.Api.Services
{
    public interface IPermissionService
    {
        Task<List<string>> GetPermissionsForUserAsync(ApplicationUser user);
        Task<List<string>> GetPermissionsForRoleIdsAsync(IEnumerable<Guid> roleIds);
    }

    public class PermissionService : IPermissionService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public PermissionService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<List<string>> GetPermissionsForUserAsync(ApplicationUser user)
        {
            var roleIds = await _context.UserRoles
                .Where(userRole => userRole.UserId == user.Id)
                .Select(userRole => userRole.RoleId)
                .ToListAsync();

            return await GetPermissionsForRoleIdsAsync(roleIds);
        }

        public async Task<List<string>> GetPermissionsForRoleIdsAsync(IEnumerable<Guid> roleIds)
        {
            var roleIdList = roleIds.Distinct().ToList();
            if (roleIdList.Count == 0)
            {
                return new List<string>();
            }

            var permissions = await _context.RolePermissions
                .Where(rolePermission => roleIdList.Contains(rolePermission.RoleId))
                .Select(rolePermission => rolePermission.PermissionKey)
                .Distinct()
                .ToListAsync();

            return permissions
                .Where(permission => PermissionCatalog.AllPermissionKeys.Contains(permission))
                .OrderBy(permission => permission)
                .ToList();
        }
    }
}
