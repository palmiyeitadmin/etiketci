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
using System.Text.Json.Nodes;

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
                .Include(t => t.Versions)
                .Select(t => new TemplateDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Code = t.Code,
                    Description = t.Description,
                    IsActive = t.IsActive,
                    CurrentActiveVersionId = t.CurrentActiveVersionId,
                    LinkedProductCount = _context.ProductTemplates.Count(pt => pt.TemplateId == t.Id),
                    DraftCount = t.Versions.Count(v => v.Status == TemplateStatus.Draft),
                    InReviewCount = t.Versions.Count(v => v.Status == TemplateStatus.InReview),
                    PublishedCount = t.Versions.Count(v => v.Status == TemplateStatus.Published),
                    LastUpdatedBy = t.Versions
                        .OrderByDescending(v => v.CreatedAt)
                        .Select(v => v.CreatedBy)
                        .FirstOrDefault(),
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    CurrentActiveVersion = t.CurrentActiveVersion != null ? new TemplateVersionDto
                    {
                        Id = t.CurrentActiveVersion.Id,
                        VersionNumber = t.CurrentActiveVersion.VersionNumber,
                        Status = t.CurrentActiveVersion.Status,
                        LayoutJson = t.CurrentActiveVersion.LayoutJson,
                        CreatedAt = t.CurrentActiveVersion.CreatedAt,
                        CreatedBy = t.CurrentActiveVersion.CreatedBy,
                        SubmittedForReviewAt = t.CurrentActiveVersion.SubmittedForReviewAt,
                        SubmittedForReviewBy = t.CurrentActiveVersion.SubmittedForReviewBy,
                        ReviewedAt = t.CurrentActiveVersion.ReviewedAt,
                        ReviewedBy = t.CurrentActiveVersion.ReviewedBy,
                        ReviewDecision = t.CurrentActiveVersion.ReviewDecision,
                        ReviewComment = t.CurrentActiveVersion.ReviewComment,
                        PublishedAt = t.CurrentActiveVersion.PublishedAt,
                        PublishedBy = t.CurrentActiveVersion.PublishedBy,
                        SourceVersionId = t.CurrentActiveVersion.SourceVersionId
                    } : null,
                    LatestVersion = t.Versions
                        .OrderByDescending(v => v.VersionNumber)
                        .Select(v => new TemplateVersionDto
                        {
                            Id = v.Id,
                            VersionNumber = v.VersionNumber,
                            Status = v.Status,
                            LayoutJson = v.LayoutJson,
                            ChangeNotes = v.ChangeNotes,
                            CreatedAt = v.CreatedAt,
                            CreatedBy = v.CreatedBy,
                            SubmittedForReviewAt = v.SubmittedForReviewAt,
                            SubmittedForReviewBy = v.SubmittedForReviewBy,
                            ReviewedAt = v.ReviewedAt,
                            ReviewedBy = v.ReviewedBy,
                            ReviewDecision = v.ReviewDecision,
                            ReviewComment = v.ReviewComment,
                            PublishedAt = v.PublishedAt,
                            PublishedBy = v.PublishedBy,
                            SourceVersionId = v.SourceVersionId
                        })
                        .FirstOrDefault()
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
                CreatedBy = v.CreatedBy,
                SubmittedForReviewAt = v.SubmittedForReviewAt,
                SubmittedForReviewBy = v.SubmittedForReviewBy,
                ReviewedAt = v.ReviewedAt,
                ReviewedBy = v.ReviewedBy,
                ReviewDecision = v.ReviewDecision,
                ReviewComment = v.ReviewComment,
                PublishedAt = v.PublishedAt,
                PublishedBy = v.PublishedBy,
                SourceVersionId = v.SourceVersionId
            }).ToList();

            var currentActiveVersion = versions.FirstOrDefault(v => v.Id == t.CurrentActiveVersionId);

            return Ok(new
            {
                success = true,
                data = new TemplateDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Code = t.Code,
                    Description = t.Description,
                    IsActive = t.IsActive,
                    CurrentActiveVersionId = t.CurrentActiveVersionId,
                    CurrentActiveVersion = currentActiveVersion,
                    LatestVersion = versions.OrderByDescending(v => v.VersionNumber).FirstOrDefault(),
                    LinkedProductCount = await _context.ProductTemplates.CountAsync(pt => pt.TemplateId == t.Id),
                    DraftCount = versions.Count(v => v.Status == TemplateStatus.Draft),
                    InReviewCount = versions.Count(v => v.Status == TemplateStatus.InReview),
                    PublishedCount = versions.Count(v => v.Status == TemplateStatus.Published),
                    LastUpdatedBy = versions.OrderByDescending(v => v.CreatedAt).FirstOrDefault()?.CreatedBy,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    Versions = versions
                }
            });
        }

        [HttpGet("variables/catalog")]
        [Authorize(Policy = "RequireViewer")]
        public IActionResult GetVariableCatalog()
        {
            var catalog = _variableService.GetVariableCatalog();
            return Ok(new { success = true, data = catalog });
        }

        [HttpGet("archived")]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetArchivedTemplates()
        {
            var items = await _context.Templates
                .Include(t => t.Versions)
                .Where(t => t.Versions.Any(v => v.Status == TemplateStatus.Archived || v.Status == TemplateStatus.Deprecated))
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
                    Versions = t.Versions
                        .Where(v => v.Status == TemplateStatus.Archived || v.Status == TemplateStatus.Deprecated)
                        .OrderByDescending(v => v.VersionNumber)
                        .Select(v => new TemplateVersionDto
                        {
                            Id = v.Id,
                            VersionNumber = v.VersionNumber,
                            Status = v.Status,
                            LayoutJson = v.LayoutJson,
                            ChangeNotes = v.ChangeNotes,
                            CreatedAt = v.CreatedAt,
                            CreatedBy = v.CreatedBy,
                            SubmittedForReviewAt = v.SubmittedForReviewAt,
                            SubmittedForReviewBy = v.SubmittedForReviewBy,
                            ReviewedAt = v.ReviewedAt,
                            ReviewedBy = v.ReviewedBy,
                            ReviewDecision = v.ReviewDecision,
                            ReviewComment = v.ReviewComment,
                            PublishedAt = v.PublishedAt,
                            PublishedBy = v.PublishedBy,
                            SourceVersionId = v.SourceVersionId
                        }).ToList()
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpPost("{id}/versions/{versionId}/restore-request")]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> CreateRestoreRequest(Guid id, Guid versionId, CreateTemplateRestorationRequestDto dto)
        {
            var version = await _context.TemplateVersions
                .Include(v => v.Template)
                .FirstOrDefaultAsync(v => v.Id == versionId && v.TemplateId == id);

            if (version == null)
            {
                return NotFound(new { success = false, error = "Template version not found." });
            }

            if (version.Status != TemplateStatus.Archived && version.Status != TemplateStatus.Deprecated)
            {
                return BadRequest(new { success = false, error = "Only archived or deprecated versions can be restored." });
            }

            var existingPendingRequest = await _context.TemplateRestorationRequests.AnyAsync(r =>
                r.TemplateId == id &&
                r.TemplateVersionId == versionId &&
                r.Status == RestorationRequestStatus.Pending);

            if (existingPendingRequest)
            {
                return BadRequest(new { success = false, error = "A pending restoration request already exists for this version." });
            }

            var request = new TemplateRestorationRequest
            {
                Id = Guid.NewGuid(),
                TemplateId = id,
                TemplateVersionId = versionId,
                BusinessJustification = dto.BusinessJustification,
                TargetEnvironment = dto.TargetEnvironment,
                RequestedUntil = dto.RequestedUntil,
                RequestedBy = User.Identity?.Name ?? "System",
                RequestedAt = DateTime.UtcNow,
                Status = RestorationRequestStatus.Pending
            };

            _context.TemplateRestorationRequests.Add(request);
            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "TemplateRestorationRequested",
                EntityId = request.Id.ToString(),
                EntityType = "TemplateRestorationRequest",
                UserId = request.RequestedBy,
                Details = $"Restoration requested for template {version.Template?.Code} version {version.VersionNumber}.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = MapRestorationRequest(request, version) });
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
                CreatedBy = User.Identity?.Name ?? "System",
                SourceVersionId = null
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

            if (version.Status != TemplateStatus.Draft)
            {
                return BadRequest(new { success = false, error = "Only Draft versions can be submitted for approval." });
            }

            var oldStatus = version.Status;
            version.Status = TemplateStatus.InReview;
            version.SubmittedForReviewAt = DateTime.UtcNow;
            version.SubmittedForReviewBy = User.Identity?.Name ?? "System";
            version.ReviewedAt = null;
            version.ReviewedBy = null;
            version.ReviewDecision = null;
            version.ReviewComment = null;

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

            if (string.IsNullOrWhiteSpace(dto.Comments))
            {
                return BadRequest(new { success = false, error = "Reviewer comments are required." });
            }

            var oldStatus = version.Status;
            version.Status = dto.Approve ? TemplateStatus.Approved : TemplateStatus.Rejected;
            version.ReviewedAt = DateTime.UtcNow;
            version.ReviewedBy = User.Identity?.Name ?? "System";
            version.ReviewDecision = dto.Approve ? TemplateStatus.Approved.ToString() : TemplateStatus.Rejected.ToString();
            version.ReviewComment = dto.Comments.Trim();
            version.ChangeNotes = string.IsNullOrWhiteSpace(version.ChangeNotes)
                ? $"Review: {dto.Comments.Trim()}"
                : $"{version.ChangeNotes} | Review: {dto.Comments.Trim()}";

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
            version.PublishedAt = DateTime.UtcNow;
            version.PublishedBy = User.Identity?.Name ?? "System";
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
            var layoutChanged = !string.Equals(version.LayoutJson, dto.LayoutJson, StringComparison.Ordinal);
            var notesChanged = !string.Equals(version.ChangeNotes, dto.ChangeNotes, StringComparison.Ordinal);
            version.LayoutJson = dto.LayoutJson;
            version.ChangeNotes = dto.ChangeNotes;
            
            var template = await _context.Templates.FindAsync(id);
            if (template != null) template.UpdatedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "TemplateDraftSaved",
                EntityId = versionId.ToString(),
                EntityType = "LabelTemplateVersion",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Draft version {version.VersionNumber} saved. LayoutChanged={layoutChanged}; ChangeNotesChanged={notesChanged}.",
                CorrelationId = HttpContext.TraceIdentifier
            });

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
                CreatedBy = User.Identity?.Name ?? "System",
                SourceVersionId = sourceVersion.Id
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
                Response.Headers.ContentDisposition = "inline";
                return File(pdf, "application/pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = "Failed to render PDF: " + ex.Message });
            }
        }

        [HttpGet("{id}/versions/{versionId}/compare")]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> CompareVersions(Guid id, Guid versionId, [FromQuery] Guid againstVersionId)
        {
            var versions = await _context.TemplateVersions
                .Where(v => v.TemplateId == id && (v.Id == versionId || v.Id == againstVersionId))
                .OrderBy(v => v.VersionNumber)
                .ToListAsync();

            var left = versions.FirstOrDefault(v => v.Id == versionId);
            var right = versions.FirstOrDefault(v => v.Id == againstVersionId);

            if (left == null || right == null)
            {
                return NotFound(new { success = false, error = "Version comparison target not found." });
            }

            var leftElements = ParseElements(left.LayoutJson);
            var rightElements = ParseElements(right.LayoutJson);

            var leftMap = leftElements.ToDictionary(item => item.Id, item => item);
            var rightMap = rightElements.ToDictionary(item => item.Id, item => item);

            var dto = new TemplateComparisonDto
            {
                TemplateId = id,
                LeftVersionId = left.Id,
                RightVersionId = right.Id,
                LeftVersionNumber = left.VersionNumber,
                RightVersionNumber = right.VersionNumber
            };

            foreach (var element in rightElements.Where(element => !leftMap.ContainsKey(element.Id)))
            {
                dto.AddedElements.Add(new TemplateComparisonElementChangeDto
                {
                    ElementId = element.Id,
                    ElementType = element.Type,
                    ChangeType = "Added",
                    Summary = $"Added {element.Type} element."
                });
            }

            foreach (var element in leftElements.Where(element => !rightMap.ContainsKey(element.Id)))
            {
                dto.RemovedElements.Add(new TemplateComparisonElementChangeDto
                {
                    ElementId = element.Id,
                    ElementType = element.Type,
                    ChangeType = "Removed",
                    Summary = $"Removed {element.Type} element."
                });
            }

            foreach (var element in leftElements.Where(element => rightMap.ContainsKey(element.Id)))
            {
                var counterpart = rightMap[element.Id];
                if (element.Raw == counterpart.Raw)
                {
                    continue;
                }

                dto.ChangedElements.Add(new TemplateComparisonElementChangeDto
                {
                    ElementId = element.Id,
                    ElementType = counterpart.Type,
                    ChangeType = "Changed",
                    Summary = BuildElementSummary(element.Raw, counterpart.Raw)
                });
            }

            return Ok(new { success = true, data = dto });
        }

        [HttpGet("restoration-approvals")]
        [Authorize(Policy = "RequireReviewer")]
        public async Task<IActionResult> GetRestorationApprovals()
        {
            var requests = await _context.TemplateRestorationRequests
                .Include(r => r.Template)
                .Include(r => r.TemplateVersion)
                .OrderBy(r => r.RequestedAt)
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = requests.Select(r => MapRestorationRequest(r, r.TemplateVersion!)).ToList()
            });
        }

        [HttpGet("restoration-approvals/{requestId}")]
        [Authorize(Policy = "RequireReviewer")]
        public async Task<IActionResult> GetRestorationApproval(Guid requestId)
        {
            var request = await _context.TemplateRestorationRequests
                .Include(r => r.Template)
                .Include(r => r.TemplateVersion)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null)
            {
                return NotFound(new { success = false, error = "Restoration request not found." });
            }

            return Ok(new { success = true, data = MapRestorationRequest(request, request.TemplateVersion!) });
        }

        [HttpPost("restoration-approvals/{requestId}/review")]
        [Authorize(Policy = "RequireReviewer")]
        public async Task<IActionResult> ReviewRestorationApproval(Guid requestId, RestorationApprovalReviewDto dto)
        {
            var request = await _context.TemplateRestorationRequests
                .Include(r => r.Template)
                .Include(r => r.TemplateVersion)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null)
            {
                return NotFound(new { success = false, error = "Restoration request not found." });
            }

            if (request.Status != RestorationRequestStatus.Pending)
            {
                return BadRequest(new { success = false, error = "Only pending restoration requests can be reviewed." });
            }

            request.ReviewComments = dto.Comments;
            request.ReviewedBy = User.Identity?.Name ?? "System";
            request.ReviewedAt = DateTime.UtcNow;

            if (dto.Approve)
            {
                var template = await _context.Templates
                    .Include(t => t.Versions)
                    .FirstAsync(t => t.Id == request.TemplateId);

                var newVersionNumber = template.Versions.Max(v => v.VersionNumber) + 1;
                var restoredVersion = new LabelTemplateVersion
                {
                    Id = Guid.NewGuid(),
                    TemplateId = template.Id,
                    VersionNumber = newVersionNumber,
                    Status = TemplateStatus.Draft,
                    LayoutJson = request.TemplateVersion!.LayoutJson,
                    ChangeNotes = string.IsNullOrWhiteSpace(dto.Comments)
                        ? $"Restored from V{request.TemplateVersion.VersionNumber}"
                        : $"Restored from V{request.TemplateVersion.VersionNumber}. {dto.Comments}",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = request.ReviewedBy,
                    SourceVersionId = request.TemplateVersionId
                };

                _context.TemplateVersions.Add(restoredVersion);
                request.Status = RestorationRequestStatus.Approved;
                request.RestoredVersionId = restoredVersion.Id;
            }
            else
            {
                request.Status = RestorationRequestStatus.Rejected;
            }

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = dto.Approve ? "TemplateRestorationApproved" : "TemplateRestorationRejected",
                EntityId = request.Id.ToString(),
                EntityType = "TemplateRestorationRequest",
                UserId = request.ReviewedBy ?? "System",
                Details = $"Restoration request reviewed for template {request.Template?.Code} version {request.TemplateVersion?.VersionNumber}.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = MapRestorationRequest(request, request.TemplateVersion!) });
        }

        [HttpGet("approvals")]
        [Authorize(Policy = "RequireReviewer")]
        public async Task<IActionResult> GetInReviewVersions()
        {
            var items = await _context.TemplateVersions
                .Include(v => v.Template)
                .Where(v => v.Status == TemplateStatus.InReview)
                .OrderBy(v => v.CreatedAt)
                .Select(v => new ApprovalSummaryDto
                {
                    TemplateId = v.TemplateId,
                    TemplateName = v.Template != null ? v.Template.Name : "N/A",
                    TemplateCode = v.Template != null ? v.Template.Code : "N/A",
                    VersionId = v.Id,
                    VersionNumber = v.VersionNumber,
                    RequestedAt = v.SubmittedForReviewAt ?? v.CreatedAt,
                    RequestedBy = v.SubmittedForReviewBy ?? v.CreatedBy,
                    ChangeNotes = v.ChangeNotes,
                    ReviewCommentSummary = v.ReviewComment
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> DeleteTemplate(Guid id)
        {
            var t = await _context.Templates.FindAsync(id);
            if (t == null) return NotFound(new { success = false, error = "Template not found." });

            // Safety Guard: Check for non-cancelled print intents
            var hasActiveIntents = await _context.PrintIntents.AnyAsync(pi => pi.TemplateId == id && PrintIntentStatuses.IsOpen(pi.Status));
            if (hasActiveIntents)
            {
                return BadRequest(new { success = false, error = "Template cannot be deleted because it is referenced by active Print Intents." });
            }

            _context.Templates.Remove(t);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "TemplateDeleted",
                EntityId = id.ToString(),
                EntityType = "LabelTemplate",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Template {t.Code} deleted.",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        private static List<(string Id, string Type, string Raw)> ParseElements(string layoutJson)
        {
            try
            {
                var json = JsonNode.Parse(layoutJson);
                var elementArray = json?["elements"]?.AsArray();
                if (elementArray == null)
                {
                    return new List<(string, string, string)>();
                }

                return elementArray
                    .Select(element => (
                        Id: element?["id"]?.GetValue<string>() ?? Guid.NewGuid().ToString(),
                        Type: element?["type"]?.GetValue<string>() ?? "unknown",
                        Raw: element?.ToJsonString() ?? "{}"))
                    .ToList();
            }
            catch
            {
                return new List<(string, string, string)>();
            }
        }

        private static string BuildElementSummary(string leftRaw, string rightRaw)
        {
            if (leftRaw == rightRaw)
            {
                return "No structural changes.";
            }

            var leftJson = JsonNode.Parse(leftRaw)?.AsObject();
            var rightJson = JsonNode.Parse(rightRaw)?.AsObject();

            if (leftJson == null || rightJson == null)
            {
                return "Element payload changed.";
            }

            var changedFields = new List<string>();
            var leftKeys = leftJson.Select(item => item.Key);
            var rightKeys = rightJson.Select(item => item.Key);

            foreach (var key in leftKeys.Union(rightKeys).Distinct())
            {
                var leftValue = leftJson[key]?.ToJsonString() ?? "null";
                var rightValue = rightJson[key]?.ToJsonString() ?? "null";

                if (!string.Equals(leftValue, rightValue, StringComparison.Ordinal))
                {
                    changedFields.Add(key);
                }
            }

            return changedFields.Count == 0
                ? "Element payload changed."
                : $"Changed fields: {string.Join(", ", changedFields)}";
        }

        private static TemplateRestorationRequestDto MapRestorationRequest(TemplateRestorationRequest request, LabelTemplateVersion version)
        {
            return new TemplateRestorationRequestDto
            {
                Id = request.Id,
                TemplateId = request.TemplateId,
                TemplateName = request.Template?.Name ?? string.Empty,
                TemplateCode = request.Template?.Code ?? string.Empty,
                TemplateVersionId = request.TemplateVersionId,
                TemplateVersionNumber = version.VersionNumber,
                TemplateVersionStatus = version.Status,
                BusinessJustification = request.BusinessJustification,
                TargetEnvironment = request.TargetEnvironment,
                RequestedUntil = request.RequestedUntil,
                RequestedBy = request.RequestedBy,
                RequestedAt = request.RequestedAt,
                Status = request.Status.ToString(),
                ReviewComments = request.ReviewComments,
                ReviewedBy = request.ReviewedBy,
                ReviewedAt = request.ReviewedAt,
                RestoredVersionId = request.RestoredVersionId
            };
        }
    }
}
