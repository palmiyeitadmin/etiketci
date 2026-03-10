using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
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

        [HttpGet]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetProducts()
        {
            var items = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Vendor)
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
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpGet("{id}")]
        [Authorize(Policy = "RequireViewer")]
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
        [Authorize(Policy = "RequireOperator")]
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
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProduct), new { id = p.Id }, new
            {
                success = true,
                data = new { id = p.Id } // Return minimal pointer due to un-included navigations on create
            });
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "RequireOperator")]
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

            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = p });
        }

        [HttpPost("import/dry-run")]
        [Authorize(Policy = "RequireOperator")]
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
            var report = await _importService.ValidateCsvAsync(stream);

            return Ok(new { success = true, data = report });
        }
    }
}
