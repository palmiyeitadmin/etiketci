using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Template;
using Plms.Api.Models.Canonical;
using Plms.Api.Services;
using System.Text.Json;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TemplatesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILabelRenderService _renderService;
        private readonly IVariableResolutionService _variableService;
        private readonly IPreviewReadinessService _readinessService;

        public TemplatesController(ApplicationDbContext context, ILabelRenderService renderService, IVariableResolutionService variableService, IPreviewReadinessService readinessService)
        {
            _context = context;
            _renderService = renderService;
            _variableService = variableService;
            _readinessService = readinessService;
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

        [HttpPost("{id}/versions/{versionId}/request-approval")]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> RequestApproval(Guid id, Guid versionId)
        {
            var version = await _context.TemplateVersions.FirstOrDefaultAsync(v => v.Id == versionId && v.TemplateId == id);
            if (version == null) return NotFound(new { success = false, error = "Version not found." });

            if (version.Status != TemplateStatus.Draft && version.Status != TemplateStatus.Rejected)
            {
                return BadRequest(new { success = false, error = "Only Draft or Rejected versions can be submitted for approval." });
            }

            var oldStatus = version.Status;
            version.Status = TemplateStatus.InReview;

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "TemplateApprovalRequested",
                EntityId = versionId.ToString(),
                EntityType = "LabelTemplateVersion",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Status changed from {oldStatus} to {version.Status}",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("{id}/versions/{versionId}/review")]
        [Authorize(Policy = "RequireReviewer")]
        public async Task<IActionResult> ReviewVersion(Guid id, Guid versionId, ReviewTemplateVersionDto dto)
        {
            var version = await _context.TemplateVersions.FirstOrDefaultAsync(v => v.Id == versionId && v.TemplateId == id);
            if (version == null) return NotFound(new { success = false, error = "Version not found." });

            if (version.Status != TemplateStatus.InReview)
            {
                return BadRequest(new { success = false, error = "Version is not in review." });
            }

            var oldStatus = version.Status;
            version.Status = dto.Approve ? TemplateStatus.Approved : TemplateStatus.Rejected;
            version.ChangeNotes = string.IsNullOrWhiteSpace(dto.Comments) 
                ? version.ChangeNotes 
                : $"{version.ChangeNotes} | Review: {dto.Comments}";

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = dto.Approve ? "TemplateApproved" : "TemplateRejected",
                EntityId = versionId.ToString(),
                EntityType = "LabelTemplateVersion",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Status changed from {oldStatus} to {version.Status}. Comments: {dto.Comments}",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("{id}/versions/{versionId}/publish")]
        [Authorize(Policy = "RequireReviewer")]
        public async Task<IActionResult> PublishTemplate(Guid id, Guid versionId)
        {
            var template = await _context.Templates.Include(t => t.Versions).FirstOrDefaultAsync(t => t.Id == id);
            if (template == null) return NotFound(new { success = false, error = "Template not found." });

            var version = template.Versions.FirstOrDefault(v => v.Id == versionId);
            if (version == null) return NotFound(new { success = false, error = "Version not found." });

            if (version.Status != TemplateStatus.Approved)
            {
                return BadRequest(new { success = false, error = "Only Approved versions can be published." });
            }

            // Deprecate old version if exists
            if (template.CurrentActiveVersionId.HasValue)
            {
                var oldActive = template.Versions.FirstOrDefault(v => v.Id == template.CurrentActiveVersionId);
                if (oldActive != null && oldActive.Id != versionId)
                {
                    oldActive.Status = TemplateStatus.Deprecated;
                }
            }

            version.Status = TemplateStatus.Published;
            template.CurrentActiveVersionId = version.Id;
            template.UpdatedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "TemplatePublished",
                EntityId = versionId.ToString(),
                EntityType = "LabelTemplateVersion",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Version {version.VersionNumber} published.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPut("{id}/versions/{versionId}")]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> UpdateVersion(Guid id, Guid versionId, UpdateTemplateVersionDto dto)
        {
            var version = await _context.TemplateVersions.FirstOrDefaultAsync(v => v.Id == versionId && v.TemplateId == id);
            if (version == null) return NotFound(new { success = false, error = "Version not found." });

            if (version.Status != TemplateStatus.Draft)
            {
                return BadRequest(new { success = false, error = "Only Draft versions can be edited." });
            }

            // TODO: In Phase J we should validate JSON here
            version.LayoutJson = dto.LayoutJson;
            version.ChangeNotes = dto.ChangeNotes;
            
            var template = await _context.Templates.FindAsync(id);
            if (template != null) template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("{id}/revisions")]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> CreateRevision(Guid id, [FromQuery] Guid fromVersionId)
        {
            var template = await _context.Templates.Include(t => t.Versions).FirstOrDefaultAsync(t => t.Id == id);
            if (template == null) return NotFound(new { success = false, error = "Template not found." });

            var sourceVersion = template.Versions.FirstOrDefault(v => v.Id == fromVersionId);
            if (sourceVersion == null) return NotFound(new { success = false, error = "Source version not found." });

            var newVersionNumber = template.Versions.Max(v => v.VersionNumber) + 1;

            var newVersion = new LabelTemplateVersion
            {
                TemplateId = id,
                VersionNumber = newVersionNumber,
                Status = TemplateStatus.Draft,
                LayoutJson = sourceVersion.LayoutJson,
                ChangeNotes = $"Revision based on V{sourceVersion.VersionNumber}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = User.Identity?.Name ?? "System"
            };

            _context.TemplateVersions.Add(newVersion);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = new { id = newVersion.Id, versionNumber = newVersion.VersionNumber } });
        }

        [HttpGet("{id}/versions/{versionId}/preview-metadata")]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetPreviewMetadata(Guid id, Guid versionId, [FromQuery] Guid? productId)
        {
            var template = await _context.Templates
                .Include(t => t.Versions.Where(v => v.Id == versionId))
                .FirstOrDefaultAsync(t => t.Id == id);

            if (template == null) return NotFound(new { success = false, error = "Template not found." });
            
            var version = template.Versions.FirstOrDefault();
            if (version == null) return NotFound(new { success = false, error = "Version not found." });

            Product? product = null;
            if (productId.HasValue)
            {
                product = await _context.Products
                    .Include(p => p.Category)
                    .Include(p => p.Vendor)
                    .FirstOrDefaultAsync(p => p.Id == productId.Value);
            }

            var warnings = new List<string>();
            var requiredVariables = _variableService.GetRequiredVariables(version.LayoutJson).ToList();

            if (productId.HasValue && product == null)
            {
                warnings.Add("Product context requested but product not found.");
            }

            try
            {
                var layoutJson = version.LayoutJson;
                if (product != null)
                {
                    layoutJson = _variableService.ResolveVariables(layoutJson, product);
                }

                var model = JsonSerializer.Deserialize<CanonicalLabelModel>(layoutJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (model != null)
                {
                    foreach (var el in model.Elements)
                    {
                        if (el.Type.ToLower() == "barcode" && el.BarcodeType != "CODE_128")
                        {
                            warnings.Add($"Barcode type '{el.BarcodeType}' may not render correctly in PDF (only CODE_128 is fully supported).");
                        }
                    }
                }
            }
            catch { /* ignore parse errors here */ }

            var readiness = await _readinessService.EvaluateReadinessAsync(version, product);
            var variableDetails = _readinessService.GetVariableDetails(version.LayoutJson, product);

            var dto = new TemplatePreviewDto
            {
                TemplateId = template.Id,
                TemplateName = template.Name,
                TemplateCode = template.Code,
                VersionId = version.Id,
                VersionNumber = version.VersionNumber,
                Status = version.Status,
                CreatedAt = version.CreatedAt,
                CreatedBy = version.CreatedBy,
                Warnings = warnings.Concat(readiness.Warnings).Distinct().ToList(),
                RequiredVariables = requiredVariables,
                HasProductContext = product != null,
                ProductName = product?.Name,
                ProductSku = product?.Sku,
                ReadinessStatus = readiness.Status,
                ReadinessErrors = readiness.Errors,
                VariableDetails = variableDetails
            };

            return Ok(new { success = true, data = dto });
        }

        [HttpGet("{id}/versions/{versionId}/preview")]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetPreview(Guid id, Guid versionId, [FromQuery] Guid? productId)
        {
            var version = await _context.TemplateVersions.FirstOrDefaultAsync(v => v.Id == versionId && v.TemplateId == id);
            if (version == null) return NotFound(new { success = false, error = "Version not found." });

            try
            {
                var layoutJson = version.LayoutJson;
                if (productId.HasValue)
                {
                    var product = await _context.Products
                        .Include(p => p.Category)
                        .Include(p => p.Vendor)
                        .FirstOrDefaultAsync(p => p.Id == productId.Value);
                    
                    if (product != null)
                    {
                        layoutJson = _variableService.ResolveVariables(layoutJson, product);
                    }
                }

                var model = JsonSerializer.Deserialize<CanonicalLabelModel>(layoutJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (model == null) return BadRequest(new { success = false, error = "Invalid layout JSON." });

                var pdf = _renderService.GeneratePdf(model);
                return File(pdf, "application/pdf", $"template_{id}_{version.VersionNumber}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = "Failed to render PDF: " + ex.Message });
            }
        }
    }
}
