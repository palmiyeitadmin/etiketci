using Microsoft.AspNetCore.Authorization;

namespace Plms.Api.Security
{
    public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
        {
            if (context.User.IsInRole(ApplicationRoles.Admin) ||
                context.User.Claims.Any(claim => claim.Type == "permission" && string.Equals(claim.Value, requirement.Permission, StringComparison.OrdinalIgnoreCase)))
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
