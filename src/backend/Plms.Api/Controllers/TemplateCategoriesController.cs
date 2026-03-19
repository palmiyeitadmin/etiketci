using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.DTOs.TemplateCategory;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/template-categories")]
    public class TemplateCategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TemplateCategoriesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetTemplateCategories()
        {
            var items = await _context.TemplateCategories
                .OrderBy(category => category.Code)
                .Select(category => new TemplateCategoryDto
                {
                    Id = category.Id,
                    Code = category.Code,
                    Name = category.Name,
                    IsActive = category.IsActive,
                    NextTemplateSequence = category.NextTemplateSequence
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpGet("{id}")]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetTemplateCategory(Guid id)
        {
            var category = await _context.TemplateCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { success = false, error = "Template category not found." });
            }

            return Ok(new
            {
                success = true,
                data = new TemplateCategoryDto
                {
                    Id = category.Id,
                    Code = category.Code,
                    Name = category.Name,
                    IsActive = category.IsActive,
                    NextTemplateSequence = category.NextTemplateSequence
                }
            });
        }

        [HttpGet("{id}/next-code")]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetNextTemplateCode(Guid id)
        {
            var category = await _context.TemplateCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { success = false, error = "Template category not found." });
            }

            var nextCode = $"PLM-{category.Code}-{category.NextTemplateSequence:D3}";
            return Ok(new
            {
                success = true,
                data = new TemplateCodePreviewDto
                {
                    CategoryId = category.Id,
                    CategoryCode = category.Code,
                    NextCode = nextCode
                }
            });
        }

        [HttpPost]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> CreateTemplateCategory(CreateTemplateCategoryDto dto)
        {
            var normalizedCode = dto.Code.Trim().ToUpperInvariant();
            if (await _context.TemplateCategories.AnyAsync(category => category.Code == normalizedCode))
            {
                return BadRequest(new { success = false, error = "Template category code already exists." });
            }

            var category = new TemplateCategory
            {
                Id = Guid.NewGuid(),
                Code = normalizedCode,
                Name = dto.Name.Trim(),
                IsActive = dto.IsActive,
                NextTemplateSequence = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.TemplateCategories.Add(category);
            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "TemplateCategoryCreated",
                EntityId = category.Id.ToString(),
                EntityType = "TemplateCategory",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Template category '{category.Name}' ({category.Code}) created.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTemplateCategory), new { id = category.Id }, new
            {
                success = true,
                data = new TemplateCategoryDto
                {
                    Id = category.Id,
                    Code = category.Code,
                    Name = category.Name,
                    IsActive = category.IsActive,
                    NextTemplateSequence = category.NextTemplateSequence
                }
            });
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> UpdateTemplateCategory(Guid id, UpdateTemplateCategoryDto dto)
        {
            var category = await _context.TemplateCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { success = false, error = "Template category not found." });
            }

            category.Name = dto.Name.Trim();
            category.IsActive = dto.IsActive;
            category.UpdatedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "TemplateCategoryUpdated",
                EntityId = category.Id.ToString(),
                EntityType = "TemplateCategory",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Template category '{category.Name}' updated. IsActive={category.IsActive}.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new
            {
                success = true,
                data = new TemplateCategoryDto
                {
                    Id = category.Id,
                    Code = category.Code,
                    Name = category.Name,
                    IsActive = category.IsActive,
                    NextTemplateSequence = category.NextTemplateSequence
                }
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "RequireAdmin")]
        public async Task<IActionResult> DeleteTemplateCategory(Guid id)
        {
            var category = await _context.TemplateCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { success = false, error = "Template category not found." });
            }

            var isInUse = await _context.Templates.AnyAsync(template => template.TemplateCategoryId == id);
            if (isInUse)
            {
                return BadRequest(new { success = false, error = "Template category cannot be deleted because one or more templates still reference it." });
            }

            _context.TemplateCategories.Remove(category);
            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "TemplateCategoryDeleted",
                EntityId = category.Id.ToString(),
                EntityType = "TemplateCategory",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Template category '{category.Name}' ({category.Code}) deleted.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }
}
