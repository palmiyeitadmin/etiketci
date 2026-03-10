using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Operational;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/Products/{productId}/Templates")]
    public class ProductTemplatesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProductTemplatesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Policy = "RequireViewer")]
        public async Task<IActionResult> GetProductTemplates(Guid productId)
        {
            var items = await _context.ProductTemplates
                .Include(pt => pt.Template)
                .Include(pt => pt.Product)
                .Where(pt => pt.ProductId == productId)
                .Select(pt => new ProductTemplateDto
                {
                    Id = pt.Id,
                    ProductId = pt.ProductId,
                    ProductName = pt.Product!.Name,
                    TemplateId = pt.TemplateId,
                    TemplateName = pt.Template!.Name,
                    TemplateCode = pt.Template.Code,
                    IsDefault = pt.IsDefault,
                    IsActive = pt.IsActive
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpPost]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> LinkTemplate(Guid productId, LinkTemplateDto dto)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null) return NotFound(new { success = false, error = "Product not found." });

            var template = await _context.Templates.FindAsync(dto.TemplateId);
            if (template == null) return NotFound(new { success = false, error = "Template not found." });

            if (await _context.ProductTemplates.AnyAsync(pt => pt.ProductId == productId && pt.TemplateId == dto.TemplateId))
            {
                return BadRequest(new { success = false, error = "Template is already linked to this product." });
            }

            if (dto.IsDefault)
            {
                // Reset other defaults for this product
                var currentDefaults = await _context.ProductTemplates.Where(pt => pt.ProductId == productId && pt.IsDefault).ToListAsync();
                foreach (var cd in currentDefaults) cd.IsDefault = false;
            }

            var pt = new ProductTemplate
            {
                Id = Guid.NewGuid(),
                ProductId = productId,
                TemplateId = dto.TemplateId,
                IsDefault = dto.IsDefault,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.ProductTemplates.Add(pt);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "ProductTemplateLinked",
                EntityId = pt.Id.ToString(),
                EntityType = "ProductTemplate",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Template {template.Code} linked to product {product.Sku}. Default: {pt.IsDefault}",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = new { id = pt.Id } });
        }

        [HttpPost("{id}/set-default")]
        [Authorize(Policy = "RequireOperator")]
        public async Task<IActionResult> SetDefault(Guid productId, Guid id)
        {
            var pt = await _context.ProductTemplates.FindAsync(id);
            if (pt == null || pt.ProductId != productId) return NotFound(new { success = false, error = "Link not found." });

            // Reset other defaults for this product
            var currentDefaults = await _context.ProductTemplates.Where(x => x.ProductId == productId && x.IsDefault).ToListAsync();
            foreach (var cd in currentDefaults) cd.IsDefault = false;

            pt.IsDefault = true;

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "RequireAdmin")]
        public async Task<IActionResult> UnlinkTemplate(Guid productId, Guid id)
        {
            var pt = await _context.ProductTemplates.FindAsync(id);
            if (pt == null || pt.ProductId != productId) return NotFound(new { success = false, error = "Link not found." });

            _context.ProductTemplates.Remove(pt);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "ProductTemplateUnlinked",
                EntityId = id.ToString(),
                EntityType = "ProductTemplate",
                UserId = User.Identity?.Name ?? "System",
                Details = $"Link removed between Product {productId} and Template {pt.TemplateId}",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }
}
