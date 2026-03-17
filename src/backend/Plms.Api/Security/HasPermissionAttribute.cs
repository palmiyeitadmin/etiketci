using Microsoft.AspNetCore.Authorization;

namespace Plms.Api.Security
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
    public sealed class HasPermissionAttribute : AuthorizeAttribute
    {
        public HasPermissionAttribute(string permission)
        {
            Policy = $"{PermissionPolicyProvider.PolicyPrefix}{permission}";
        }
    }
}
