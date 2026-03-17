using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Plms.Api.Domain.Entities;
using Plms.Api.Models.Auth;
using Plms.Api.Services;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly IPermissionService _permissionService;

        public AuthController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            IConfiguration configuration,
            IPermissionService permissionService)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _configuration = configuration;
            _permissionService = permissionService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return Unauthorized(new { success = false, error = "Invalid credentials." });
            }

            if (!user.IsActive)
            {
                return Unauthorized(new { success = false, error = "Account inactive." });
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
            if (!result.Succeeded)
            {
                return Unauthorized(new { success = false, error = "Invalid credentials." });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var permissions = await _permissionService.GetPermissionsForUserAsync(user);
            var token = GenerateJwtToken(user, roles, permissions);

            user.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            return Ok(new
            {
                success = true,
                data = new
                {
                    user = new UserDto
                    {
                        Id = user.Id,
                        Email = user.Email ?? string.Empty,
                        FullName = user.FullName,
                        Roles = roles.ToList(),
                        Permissions = permissions,
                        IsActive = user.IsActive,
                        MustChangePassword = user.MustChangePassword
                    },
                    token
                }
            });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return Ok(new { success = true });
        }

        [HttpPost("setup-password")]
        public async Task<IActionResult> SetupPassword([FromBody] SetupPasswordRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return BadRequest(new { success = false, error = "User not found." });
            }

            var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(new { success = false, errors = result.Errors.Select(e => e.Description) });
            }

            user.EmailConfirmed = true;
            user.IsActive = true;
            user.MustChangePassword = false;
            await _userManager.UpdateAsync(user);

            return Ok(new { success = true, message = "Password set successfully. You can now log in." });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { success = false, error = "User not found." });
            }

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(new { success = false, errors = result.Errors.Select(e => e.Description) });
            }

            user.MustChangePassword = false;
            await _userManager.UpdateAsync(user);

            return Ok(new { success = true, message = "Password changed successfully." });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { success = false, error = "Unauthorized." });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var permissions = await _permissionService.GetPermissionsForUserAsync(user);

            return Ok(new
            {
                success = true,
                data = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email ?? string.Empty,
                    FullName = user.FullName,
                    Roles = roles.ToList(),
                    Permissions = permissions,
                    IsActive = user.IsActive,
                    MustChangePassword = user.MustChangePassword
                }
            });
        }

        private string GenerateJwtToken(ApplicationUser user, IList<string> roles, IList<string> permissions)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? "PLMS_SUPER_SECRET_KEY_2026_DEVELOPMENT_ONLY";
            var key = Encoding.ASCII.GetBytes(jwtKey);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Email, user.Email ?? string.Empty),
                new(ClaimTypes.Name, user.FullName),
                new("must_change_password", user.MustChangePassword.ToString().ToLowerInvariant())
            };

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            foreach (var permission in permissions.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                claims.Add(new Claim("permission", permission));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(8),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
