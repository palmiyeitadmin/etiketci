using Plms.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.DTOs.Audit;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/audit-logs")]
    [HasPermission(Permissions.AuditView)]
    public class AuditLogsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AuditLogsController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>Correlation id of audit entries written by startup housekeeping (see Program.cs).</summary>
        public const string SystemCorrelationId = "seed";

        [HttpGet]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] string? entityType,
            [FromQuery] string? action,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] bool includeSystem = false)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.AuditLogs.AsNoTracking().AsQueryable();

            // Entries the application writes for itself at startup (e.g. default role permissions) are
            // housekeeping, not user activity; they are listed only on request.
            if (!includeSystem)
            {
                query = query.Where(a => a.CorrelationId != SystemCorrelationId);
            }

            if (!string.IsNullOrWhiteSpace(entityType))
            {
                query = query.Where(a => a.EntityType == entityType);
            }

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(a => EF.Functions.ILike(a.Action, $"%{action}%"));
            }

            if (from.HasValue)
            {
                query = query.Where(a => a.Timestamp >= from.Value);
            }

            if (to.HasValue)
            {
                query = query.Where(a => a.Timestamp <= to.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AuditLogListItemDto
                {
                    Id = a.Id,
                    Timestamp = a.Timestamp,
                    Action = a.Action,
                    EntityId = a.EntityId,
                    EntityType = a.EntityType,
                    Details = a.Details,
                    UserId = a.UserId,
                    CorrelationId = a.CorrelationId,
                    Metadata = a.Metadata
                })
                .ToListAsync();

            var result = new PagedResultDto<AuditLogListItemDto>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };

            return Ok(new { success = true, data = result });
        }
    }
}
