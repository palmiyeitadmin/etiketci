using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.DTOs.ProductCategory;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/categories")]
    [Authorize(Policy = "RequireOperator")] 
    public class ProductCategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProductCategoriesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetCategories()
        {
            var items = await _context.ProductCategories
                .Select(c => new ProductCategoryDto
                {
                    Id = c.Id,
                    Code = c.Code,
                    Name = c.Name,
                    IsActive = c.IsActive
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCategory(Guid id)
        {
            var cat = await _context.ProductCategories.FindAsync(id);

            if (cat == null)
            {
                return NotFound(new { success = false, error = "Category not found." });
            }

            return Ok(new
            {
                success = true,
                data = new ProductCategoryDto
                {
                    Id = cat.Id,
                    Code = cat.Code,
                    Name = cat.Name,
                    IsActive = cat.IsActive
                }
            });
        }

        [HttpPost]
        public async Task<IActionResult> CreateCategory(CreateProductCategoryDto dto)
        {
            if (await _context.ProductCategories.AnyAsync(c => c.Code == dto.Code))
            {
                return BadRequest(new { success = false, error = "Category Code already exists." });
            }

            var cat = new ProductCategory
            {
                Code = dto.Code,
                Name = dto.Name,
                IsActive = dto.IsActive
            };

            _context.ProductCategories.Add(cat);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCategory), new { id = cat.Id }, new
            {
                success = true,
                data = new ProductCategoryDto
                {
                    Id = cat.Id,
                    Code = cat.Code,
                    Name = cat.Name,
                    IsActive = cat.IsActive
                }
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(Guid id, UpdateProductCategoryDto dto)
        {
            var cat = await _context.ProductCategories.FindAsync(id);
            if (cat == null)
            {
                return NotFound(new { success = false, error = "Category not found." });
            }

            cat.Name = dto.Name;
            cat.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = cat });
        }
    }
}
