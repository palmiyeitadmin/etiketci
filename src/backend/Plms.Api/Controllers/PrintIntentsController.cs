using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Operational;
using Plms.Api.Models.Operational;
using Plms.Api.Services;
using System.Text.Json;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PrintIntentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPreviewReadinessService _readinessService;

        public PrintIntentsController(ApplicationDbContext context, IPreviewReadinessService readinessService)
        {
            _context = context;
            _readinessService = readinessService;
        }

        [HttpGet]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetPrintIntents()
        {
            var items = await _context.PrintIntents
                .Include(pi => pi.Product)
                .Include(pi => pi.Template)
                .Include(pi => pi.Version)
                .OrderByDescending(pi => pi.CreatedAt)
                .Select(pi => new PrintIntentDto
                {
                    Id = pi.Id,
                    ProductId = pi.ProductId,
                    ProductName = pi.Product!.Name,
                    TemplateId = pi.TemplateId,
                    TemplateName = pi.Template!.Name,
                    VersionId = pi.VersionId,
                    VersionNumber = pi.Version!.VersionNumber,
                    Quantity = pi.Quantity,
                    Status = pi.Status,
                    RequestedBy = pi.RequestedBy,
                    CreatedAt = pi.CreatedAt,
                    ReadinessSnapshot = pi.ReadinessSnapshot
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpPost]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> CreatePrintIntent(CreatePrintIntentDto dto)
        {
            var product = await _context.Products.FindAsync(dto.ProductId);
            if (product == null) return NotFound(new { success = false, error = "Product not found." });

            var template = await _context.Templates.FindAsync(dto.TemplateId);
            if (template == null) return NotFound(new { success = false, error = "Template not found." });

            var version = await _context.TemplateVersions.FirstOrDefaultAsync(v => v.Id == dto.VersionId && v.TemplateId == dto.TemplateId);
            if (version == null) return NotFound(new { success = false, error = "Template version not found." });

            if (version.Status != Domain.Enums.TemplateStatus.Published)
            {
                return BadRequest(new { success = false, error = "Only Published template versions can be used for print intents." });
            }

            // Validate Readiness
            var readiness = await _readinessService.EvaluateReadinessAsync(version, product);
            if (readiness.Status == ReadinessStatus.Blocked)
            {
                return BadRequest(new { success = false, error = "Intent creation blocked.", details = readiness.Errors });
            }

            var pi = new PrintIntent
            {
                Id = Guid.NewGuid(),
                ProductId = dto.ProductId,
                TemplateId = dto.TemplateId,
                VersionId = dto.VersionId,
                Quantity = dto.Quantity,
                Status = "Ready",
                RequestedBy = User.Identity?.Name ?? "System",
                CreatedAt = DateTime.UtcNow,
                ReadinessSnapshot = JsonSerializer.Serialize(readiness)
            };

            _context.PrintIntents.Add(pi);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "PrintIntentCreated",
                EntityId = pi.Id.ToString(),
                EntityType = "PrintIntent",
                UserId = pi.RequestedBy,
                Details = $"Intent created for Product {product.Sku}, Template {template.Code} V{version.VersionNumber}, Qty: {pi.Quantity}",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = new { id = pi.Id } });
        }
    }
}
