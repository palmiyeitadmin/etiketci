using Microsoft.AspNetCore.Mvc;
using Plms.Api.Security;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PermissionsController : ControllerBase
    {
        [HttpGet("catalog")]
        [HasPermission(Permissions.RolesView)]
        public IActionResult GetCatalog()
        {
            return Ok(new { success = true, data = PermissionCatalog.Groups });
        }
    }
}
