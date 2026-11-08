using Plms.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Services;
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
        [HasPermission(Permissions.ProductsView)]
        public async Task<IActionResult> GetProductTemplates(Guid productId)
        {
            var rows = await _context.ProductTemplates.AsNoTracking()
                .Include(pt => pt.Template).ThenInclude(t => t!.CurrentActiveVersion)
                .Include(pt => pt.Product)
                .Where(pt => pt.ProductId == productId)
                .OrderByDescending(pt => pt.IsDefault)
                .ThenBy(pt => pt.Template!.Name)
                .ToListAsync();

            var items = rows.Select(pt =>
            {
                var published = pt.Template?.CurrentActiveVersion;
                var isPublished = published != null && published.Status == TemplateStatus.Published && pt.Template?.IsArchived != true;
                var size = isPublished ? ReadLabelSize(published!.LayoutJson) : null;
                return new ProductTemplateDto
                {
                    Id = pt.Id,
                    ProductId = pt.ProductId,
                    ProductName = pt.Product?.Name ?? string.Empty,
                    TemplateId = pt.TemplateId,
                    TemplateName = pt.Template?.Name ?? string.Empty,
                    TemplateCode = pt.Template?.Code ?? string.Empty,
                    IsDefault = pt.IsDefault,
                    IsActive = pt.IsActive,
                    PublishedVersionId = isPublished ? published!.Id : null,
                    PublishedVersionNumber = isPublished ? published!.VersionNumber : null,
                    WidthMm = size?.WidthMm,
                    HeightMm = size?.HeightMm,
                };
            }).ToList();

            return Ok(new { success = true, data = items });
        }

        [HttpPost]
        [HasPermission(Permissions.ProductsEdit)]
        public async Task<IActionResult> LinkTemplate(Guid productId, LinkTemplateDto dto)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null) return NotFound(ApiError.Of("product_not_found", "Product not found."));

            var template = await _context.Templates.FindAsync(dto.TemplateId);
            if (template == null) return NotFound(ApiError.Of("template_not_found", "Template not found."));

            if (await _context.ProductTemplates.AnyAsync(pt => pt.ProductId == productId && pt.TemplateId == dto.TemplateId))
            {
                return BadRequest(ApiError.Of("template_already_linked", "Template is already linked to this product."));
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
                Metadata = AuditWriter.Json(new { code = template.Code, sku = product.Sku, isDefault = pt.IsDefault }),
                Details = $"Template {template.Code} linked to product {product.Sku}. Default: {pt.IsDefault}",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = new { id = pt.Id } });
        }

        [HttpPost("{id}/set-default")]
        [HasPermission(Permissions.ProductsEdit)]
        public async Task<IActionResult> SetDefault(Guid productId, Guid id)
        {
            var pt = await _context.ProductTemplates.FindAsync(id);
            if (pt == null || pt.ProductId != productId) return NotFound(ApiError.Of("link_not_found", "Link not found."));

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
            if (pt == null || pt.ProductId != productId) return NotFound(ApiError.Of("link_not_found", "Link not found."));

            var linkedTemplateCode = await _context.Templates.Where(t => t.Id == pt.TemplateId).Select(t => t.Code).FirstOrDefaultAsync();
            var linkedProductSku = await _context.Products.Where(p => p.Id == productId).Select(p => p.Sku).FirstOrDefaultAsync();
            _context.ProductTemplates.Remove(pt);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = "ProductTemplateUnlinked",
                EntityId = id.ToString(),
                EntityType = "ProductTemplate",
                UserId = User.Identity?.Name ?? "System",
                Metadata = AuditWriter.Json(new { code = linkedTemplateCode, sku = linkedProductSku }),
                Details = $"Link removed between Product {productId} and Template {pt.TemplateId}",
                CorrelationId = HttpContext.TraceIdentifier
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        private static Models.Canonical.LabelDimensions? ReadLabelSize(string layoutJson)
        {
            try
            {
                var model = System.Text.Json.JsonSerializer.Deserialize<Models.Canonical.CanonicalLabelModel>(layoutJson, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return model?.Dimensions;
            }
            catch (System.Text.Json.JsonException)
            {
                return null;
            }
        }
    }
}
