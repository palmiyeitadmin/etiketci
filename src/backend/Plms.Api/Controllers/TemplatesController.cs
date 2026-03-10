using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Template;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TemplatesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TemplatesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetTemplates()
        {
            var items = await _context.Templates
                .Include(t => t.CurrentActiveVersion)
                .Select(t => new TemplateDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Code = t.Code,
                    Description = t.Description,
                    IsActive = t.IsActive,
                    CurrentActiveVersionId = t.CurrentActiveVersionId,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    CurrentActiveVersion = t.CurrentActiveVersion != null ? new TemplateVersionDto
                    {
                        Id = t.CurrentActiveVersion.Id,
                        VersionNumber = t.CurrentActiveVersion.VersionNumber,
                        Status = t.CurrentActiveVersion.Status,
                        CreatedAt = t.CurrentActiveVersion.CreatedAt
                    } : null
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpGet("{id}")]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetTemplate(Guid id)
        {
            var t = await _context.Templates
                .Include(t => t.Versions.OrderByDescending(v => v.VersionNumber))
                .FirstOrDefaultAsync(t => t.Id == id);

            if (t == null) return NotFound(new { success = false, error = "Template not found." });

            var versions = t.Versions.Select(v => new TemplateVersionDto
            {
                Id = v.Id,
                VersionNumber = v.VersionNumber,
                Status = v.Status,
                LayoutJson = v.LayoutJson,
                ChangeNotes = v.ChangeNotes,
                CreatedAt = v.CreatedAt,
                CreatedBy = v.CreatedBy
            }).ToList();

            return Ok(new
            {
                success = true,
                data = new
                {
                    Id = t.Id,
                    t.Name,
                    t.Code,
                    t.Description,
                    t.IsActive,
                    t.CurrentActiveVersionId,
                    t.CreatedAt,
                    t.UpdatedAt,
                    Versions = versions
                }
            });
        }

        [HttpPost]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> CreateTemplate(CreateTemplateDto dto)
        {
            if (await _context.Templates.AnyAsync(t => t.Code == dto.Code))
            {
                return BadRequest(new { success = false, error = "Template code already exists." });
            }

            var template = new LabelTemplate
            {
                Name = dto.Name,
                Code = dto.Code,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            var version = new LabelTemplateVersion
            {
                Template = template,
                VersionNumber = 1,
                Status = TemplateStatus.Draft,
                LayoutJson = dto.InitialLayoutJson,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = User.Identity?.Name ?? "System"
            };

            _context.Templates.Add(template);
            _context.TemplateVersions.Add(version);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, new { success = true, data = new { id = template.Id } });
        }

        [HttpPost("{id}/publish")]
        [Authorize(Policy = "RequireReviewer")]
        public async Task<IActionResult> PublishTemplate(Guid id, [FromQuery] Guid versionId)
        {
            var template = await _context.Templates.Include(t => t.Versions).FirstOrDefaultAsync(t => t.Id == id);
            if (template == null) return NotFound(new { success = false, error = "Template not found." });

            var version = template.Versions.FirstOrDefault(v => v.Id == versionId);
            if (version == null) return NotFound(new { success = false, error = "Version not found." });

            // Deprecate old version if exists
            if (template.CurrentActiveVersionId.HasValue)
            {
                var oldActive = template.Versions.FirstOrDefault(v => v.Id == template.CurrentActiveVersionId);
                if (oldActive != null) oldActive.Status = TemplateStatus.Deprecated;
            }

            version.Status = TemplateStatus.Published;
            template.CurrentActiveVersionId = version.Id;
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }
    }
}
