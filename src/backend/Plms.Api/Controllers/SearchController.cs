using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.DTOs.Search;
using Plms.Api.Security;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/search")]
    [Authorize(Policy = "RequireViewer")]
    public class SearchController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SearchController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] int limit = 6, CancellationToken cancellationToken = default)
        {
            var query = q?.Trim();
            var normalizedLimit = Math.Clamp(limit, 1, 10);
            var groups = new List<SearchGroupDto>();

            var pageResults = GetPageResults();
            if (pageResults.Items.Count > 0)
            {
                groups.Add(pageResults);
            }

            if (string.IsNullOrWhiteSpace(query))
            {
                return Ok(new { success = true, data = new GlobalSearchResponseDto { Groups = groups } });
            }

            if (HasPermission(Permissions.TemplatesView))
            {
                var templates = await _context.Templates
                    .Where(template => EF.Functions.ILike(template.Name, $"%{query}%") || EF.Functions.ILike(template.Code, $"%{query}%"))
                    .OrderByDescending(template => template.UpdatedAt)
                    .Take(normalizedLimit)
                    .Select(template => new SearchItemDto
                    {
                        Id = template.Id.ToString(),
                        Label = template.Name,
                        Description = template.Code,
                        Href = $"/templates/{template.Id}",
                        Type = "template",
                        Badge = template.CurrentActiveVersionId != null ? "Published" : "Draft"
                    })
                    .ToListAsync(cancellationToken);

                if (templates.Count > 0)
                {
                    groups.Add(new SearchGroupDto { Key = "templates", Label = "Templates", Items = templates });
                }
            }

            if (HasPermission(Permissions.ProductsView))
            {
                var products = await _context.Products
                    .Where(product => EF.Functions.ILike(product.Name, $"%{query}%") || EF.Functions.ILike(product.Sku, $"%{query}%"))
                    .OrderBy(product => product.Name)
                    .Take(normalizedLimit)
                    .Select(product => new SearchItemDto
                    {
                        Id = product.Id.ToString(),
                        Label = product.Name,
                        Description = product.Sku,
                        Href = $"/products/{product.Id}",
                        Type = "product",
                        Badge = product.IsActive ? "Active" : "Inactive"
                    })
                    .ToListAsync(cancellationToken);

                if (products.Count > 0)
                {
                    groups.Add(new SearchGroupDto { Key = "products", Label = "Products", Items = products });
                }
            }

            if (HasPermission(Permissions.PrintIntentsView))
            {
                var printIntents = await _context.PrintIntents
                    .Include(printIntent => printIntent.Product)
                    .Include(printIntent => printIntent.Template)
                    .Where(printIntent =>
                        EF.Functions.ILike(printIntent.Status, $"%{query}%") ||
                        EF.Functions.ILike(printIntent.Product!.Name, $"%{query}%") ||
                        EF.Functions.ILike(printIntent.Template!.Code, $"%{query}%"))
                    .OrderByDescending(printIntent => printIntent.CreatedAt)
                    .Take(normalizedLimit)
                    .Select(printIntent => new SearchItemDto
                    {
                        Id = printIntent.Id.ToString(),
                        Label = printIntent.Product!.Name,
                        Description = $"{printIntent.Template!.Code} x {printIntent.Quantity}",
                        Href = $"/print-intents/{printIntent.Id}",
                        Type = "print-intent",
                        Badge = printIntent.Status
                    })
                    .ToListAsync(cancellationToken);

                if (printIntents.Count > 0)
                {
                    groups.Add(new SearchGroupDto { Key = "printintents", Label = "Print Intents", Items = printIntents });
                }
            }

            if (HasPermission(Permissions.UsersView))
            {
                var users = await _context.Users
                    .Where(user => EF.Functions.ILike(user.FullName, $"%{query}%") || EF.Functions.ILike(user.Email!, $"%{query}%"))
                    .OrderBy(user => user.FullName)
                    .Take(normalizedLimit)
                    .Select(user => new SearchItemDto
                    {
                        Id = user.Id.ToString(),
                        Label = user.FullName,
                        Description = user.Email,
                        Href = $"/admin/users/{user.Id}",
                        Type = "user",
                        Badge = user.IsActive ? "Active" : "Inactive"
                    })
                    .ToListAsync(cancellationToken);

                if (users.Count > 0)
                {
                    groups.Add(new SearchGroupDto { Key = "users", Label = "Users", Items = users });
                }
            }

            if (HasPermission(Permissions.RolesView))
            {
                var roles = await _context.Roles
                    .Where(role => EF.Functions.ILike(role.Name!, $"%{query}%"))
                    .OrderBy(role => role.Name)
                    .Take(normalizedLimit)
                    .Select(role => new SearchItemDto
                    {
                        Id = role.Id.ToString(),
                        Label = role.Name!,
                        Description = role.Description,
                        Href = "/admin/roles",
                        Type = "role",
                        Badge = role.IsSystem ? "System" : "Custom"
                    })
                    .ToListAsync(cancellationToken);

                if (roles.Count > 0)
                {
                    groups.Add(new SearchGroupDto { Key = "roles", Label = "Roles", Items = roles });
                }
            }

            return Ok(new { success = true, data = new GlobalSearchResponseDto { Groups = groups } });
        }

        private SearchGroupDto GetPageResults()
        {
            var items = new List<SearchItemDto>();

            void AddPage(string permission, string label, string href, string description)
            {
                if (!HasPermission(permission))
                {
                    return;
                }

                items.Add(new SearchItemDto
                {
                    Id = href,
                    Label = label,
                    Description = description,
                    Href = href,
                    Type = "page"
                });
            }

            AddPage(Permissions.DashboardView, "Dashboard", "/", "Operational overview");
            AddPage(Permissions.ProductsView, "Products", "/products", "Product catalog");
            AddPage(Permissions.TemplatesView, "Templates", "/templates", "Template governance");
            AddPage(Permissions.PrintIntentsView, "Print Intents", "/print-intents", "Print queue");
            AddPage(Permissions.TemplatesReview, "Approvals", "/approvals", "Approval queue");
            AddPage(Permissions.UsersView, "Users", "/admin/users", "User management");
            AddPage(Permissions.RolesView, "Roles", "/admin/roles", "Role management");
            AddPage(Permissions.AssetsView, "Library", "/content-library", "Shared content library");

            return new SearchGroupDto
            {
                Key = "pages",
                Label = "Pages",
                Items = items
            };
        }

        private bool HasPermission(string permission)
        {
            return User.IsInRole(ApplicationRoles.Admin) ||
                   User.Claims.Any(claim => claim.Type == "permission" && string.Equals(claim.Value, permission, StringComparison.OrdinalIgnoreCase));
        }
    }
}
