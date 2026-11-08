using Plms.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.DTOs.Operational;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Product;

using Plms.Api.Services;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IProductImportService _importService;

        public ProductsController(ApplicationDbContext context, IProductImportService importService)
        {
            _context = context;
            _importService = importService;
        }

        /// <summary>
        /// Products, optionally filtered by name/SKU and active state. Pass <c>page</c> to get a paged result
        /// ({ items, total, page, pageSize }); without it the full list is returned as before.
        /// </summary>
        [HttpGet]
        [HasPermission(Permissions.ProductsView)]
        public async Task<IActionResult> GetProducts([FromQuery] string? search, [FromQuery] bool? active, [FromQuery] int? page = null, [FromQuery] int pageSize = 50)
        {
            var query = _context.Products.AsNoTracking().AsQueryable();

            if (active.HasValue) query = query.Where(p => p.IsActive == active.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(term) || p.Sku.ToLower().Contains(term));
            }

            // Exact SKU matches first (a scanner sends the full SKU), then by name.
            var exact = search?.Trim().ToLower() ?? string.Empty;
            var projected = query
                .OrderByDescending(p => p.Sku.ToLower() == exact)
                .ThenBy(p => p.Name)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Sku = p.Sku,
                    Name = p.Name,
                    Description = p.Description,
                    CategoryId = p.CategoryId,
                    VendorId = p.VendorId,
                    IsActive = p.IsActive,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    CategoryName = p.Category != null ? p.Category.Name : null,
                    VendorName = p.Vendor != null ? p.Vendor.Name : null
                });

            if (!page.HasValue)
            {
                return Ok(new { success = true, data = await projected.ToListAsync() });
            }

            var size = Math.Clamp(pageSize, 1, 200);
            var current = Math.Max(1, page.Value);
            var total = await query.CountAsync();
            var items = await projected.Skip((current - 1) * size).Take(size).ToListAsync();
            return Ok(new { success = true, data = new PagedResult<ProductDto> { Items = items, Total = total, Page = current, PageSize = size } });
        }

        /// <summary>Exact, case-insensitive SKU lookup for barcode scanners.</summary>
        [HttpGet("by-sku/{sku}")]
        [HasPermission(Permissions.ProductsView)]
        public async Task<IActionResult> GetProductBySku(string sku)
        {
            var normalized = sku.Trim().ToLower();
            var p = await _context.Products.AsNoTracking()
                .Include(x => x.Category)
                .Include(x => x.Vendor)
                .FirstOrDefaultAsync(x => x.Sku.ToLower() == normalized);
            if (p == null) return NotFound(new { success = false, error = "Product not found.", code = "PRODUCT_NOT_FOUND" });

            return Ok(new
            {
                success = true,
                data = new ProductDto
                {
                    Id = p.Id,
                    Sku = p.Sku,
                    Name = p.Name,
                    Description = p.Description,
                    CategoryId = p.CategoryId,
                    VendorId = p.VendorId,
                    IsActive = p.IsActive,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    CategoryName = p.Category?.Name,
                    VendorName = p.Vendor?.Name
                }
            });
        }

        [HttpGet("{id}")]
        [HasPermission(Permissions.ProductsView)]
        public async Task<IActionResult> GetProduct(Guid id)
        {
            var p = await _context.Products
                .Include(x => x.Category)
                .Include(x => x.Vendor)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (p == null)
            {
                return NotFound(new { success = false, error = "Product not found." });
            }

            return Ok(new
            {
                success = true,
                data = new ProductDto
                {
                    Id = p.Id,
                    Sku = p.Sku,
                    Name = p.Name,
                    Description = p.Description,
                    CategoryId = p.CategoryId,
                    VendorId = p.VendorId,
                    IsActive = p.IsActive,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    CategoryName = p.Category != null ? p.Category.Name : null,
                    VendorName = p.Vendor != null ? p.Vendor.Name : null
                }
            });
        }

        [HttpPost]
        [HasPermission(Permissions.ProductsCreate)]
        public async Task<IActionResult> CreateProduct(CreateProductDto dto)
        {
            if (await _context.Products.AnyAsync(p => p.Sku == dto.Sku))
            {
                return BadRequest(new { success = false, error = "Product SKU already exists." });
            }

            var p = new Product
            {
                Sku = dto.Sku,
                Name = dto.Name,
                Description = dto.Description,
                CategoryId = dto.CategoryId,
                VendorId = dto.VendorId,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Products.Add(p);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "ProductCreated",
                EntityId = p.Id.ToString(),
                EntityType = "Product",
                UserId = User.Identity?.Name ?? "System",
                Metadata = AuditWriter.Json(new { sku = p.Sku, name = p.Name }),
                Details = $"Product {p.Sku} created.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProduct), new { id = p.Id }, new
            {
                success = true,
                data = new { id = p.Id } // Return minimal pointer due to un-included navigations on create
            });
        }

        [HttpPut("{id}")]
        [HasPermission(Permissions.ProductsEdit)]
        public async Task<IActionResult> UpdateProduct(Guid id, UpdateProductDto dto)
        {
            var p = await _context.Products.FindAsync(id);
            if (p == null)
            {
                return NotFound(new { success = false, error = "Product not found." });
            }

            p.Name = dto.Name;
            p.Description = dto.Description;
            p.CategoryId = dto.CategoryId;
            p.VendorId = dto.VendorId;
            p.IsActive = dto.IsActive;
            p.UpdatedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "ProductUpdated",
                EntityId = p.Id.ToString(),
                EntityType = "Product",
                UserId = User.Identity?.Name ?? "System",
                Metadata = AuditWriter.Json(new { sku = p.Sku, name = p.Name }),
                Details = $"Product {p.Sku} updated.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = p });
        }

        [HttpPost("import/dry-run")]
        [HasPermission(Permissions.ProductsImport)]
        public async Task<IActionResult> ImportDryRun(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { success = false, error = "No file uploaded." });
            }

            if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, error = "Invalid file type. Only CSV is supported." });
            }

            using var stream = file.OpenReadStream();
            var session = await _importService.CreateImportSessionAsync(stream, file.FileName, User.Identity?.Name ?? "System");

            return Ok(new { success = true, data = session });
        }

        [HttpGet("import/sessions")]
        [HasPermission(Permissions.ProductsImport)]
        public async Task<IActionResult> GetImportSessions()
        {
            var sessions = await _importService.GetImportSessionsAsync();
            return Ok(new { success = true, data = sessions });
        }

        [HttpGet("import/sessions/{sessionId}")]
        [HasPermission(Permissions.ProductsImport)]
        public async Task<IActionResult> GetImportSession(Guid sessionId)
        {
            var session = await _importService.GetImportSessionAsync(sessionId);
            if (session == null)
            {
                return NotFound(new { success = false, error = "Import session not found." });
            }

            return Ok(new { success = true, data = session });
        }

        [HttpPost("import/sessions/{sessionId}/overwrite")]
        [HasPermission(Permissions.ProductsImport)]
        public async Task<IActionResult> EnableOverwrite(Guid sessionId)
        {
            var session = await _importService.EnableOverwriteAsync(sessionId);
            if (session == null)
            {
                return NotFound(new { success = false, error = "Import session not found." });
            }

            return Ok(new { success = true, data = session });
        }

        [HttpPost("import/sessions/{sessionId}/commit")]
        [HasPermission(Permissions.ProductsImport)]
        public async Task<IActionResult> CommitImportSession(Guid sessionId)
        {
            try
            {
                var result = await _importService.CommitImportSessionAsync(sessionId, User.Identity?.Name ?? "System", HttpContext.TraceIdentifier);
                if (result == null)
                {
                    return NotFound(new { success = false, error = "Import session not found." });
                }

                return Ok(new { success = true, data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [HasPermission(Permissions.ProductsDelete)]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var p = await _context.Products.FindAsync(id);
            if (p == null) return NotFound(new { success = false, error = "Product not found." });

            // Safety Guard: Check for non-cancelled print intents
            var openStatuses = PrintIntentStatuses.OpenStatuses;
            var hasActiveIntents = await _context.PrintIntents.AnyAsync(pi => pi.ProductId == id && openStatuses.Contains(pi.Status));
            if (hasActiveIntents)
            {
                return BadRequest(new { success = false, error = "Product cannot be deleted because it is referenced by active Print Intents." });
            }

            // A product with print history is deactivated instead of deleted, so the history stays intact.
            var hasPrintHistory = await _context.PrintIntents.AnyAsync(pi => pi.ProductId == id);
            if (hasPrintHistory)
            {
                p.IsActive = false;
                p.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.Products.Remove(p);
            }

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = hasPrintHistory ? "ProductDeactivated" : "ProductDeleted",
                EntityId = id.ToString(),
                EntityType = "Product",
                UserId = User.Identity?.Name ?? "System",
                Metadata = AuditWriter.Json(new { sku = p.Sku, name = p.Name }),
                Details = hasPrintHistory
                    ? $"Product {p.Sku} has print history, so it was deactivated instead of deleted."
                    : $"Product {p.Sku} deleted.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = new { deactivated = hasPrintHistory } });
        }
    }
}
