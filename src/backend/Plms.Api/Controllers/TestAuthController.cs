using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestAuthController : ControllerBase
    {
        [HttpGet("public")]
        public IActionResult GetPublic()
        {
            return Ok(new
            {
                success = true,
                data = new { message = "This is a public endpoint." }
            });
        }

        [HttpGet("protected")]
        [Authorize]
        public IActionResult GetProtected()
        {
            var user = HttpContext.User.Identity?.Name ?? "Unknown";
            return Ok(new
            {
                success = true,
                data = new { message = $"Hello {user}, you are authenticated." }
            });
        }

        [HttpGet("admin-only")]
        [Authorize(Policy = "RequireAdmin")]
        public IActionResult GetAdminOnly()
        {
            var user = HttpContext.User.Identity?.Name ?? "Unknown";
            return Ok(new
            {
                success = true,
                data = new { message = $"Hello {user}, you have Admin access." }
            });
        }
    }
}
