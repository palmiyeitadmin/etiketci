using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Dashboard;

namespace Plms.Api.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize(Policy = "RequireViewer")]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
            var openStatuses = new[]
            {
                PrintIntentStatuses.Pending,
                PrintIntentStatuses.ReadyForPrint,
                PrintIntentStatuses.SentToClient
            };

            var summary = new DashboardSummaryDto
            {
                TotalProducts = await _context.Products.CountAsync(),
                ActiveProducts = await _context.Products.CountAsync(p => p.IsActive),
                PublishedTemplates = await _context.TemplateVersions.CountAsync(v => v.Status == TemplateStatus.Published),
                DraftTemplates = await _context.TemplateVersions.CountAsync(v => v.Status == TemplateStatus.Draft),
                PendingApprovals = await _context.TemplateVersions.CountAsync(v => v.Status == TemplateStatus.InReview),
                PendingPrintIntents = await _context.PrintIntents.CountAsync(pi => openStatuses.Contains(pi.Status)),
                RecentImportCount = await _context.AuditLogs.CountAsync(a => a.Timestamp >= sevenDaysAgo && EF.Functions.ILike(a.Action, "%Import%"))
            };

            return Ok(new { success = true, data = summary });
        }

        [HttpGet("activity")]
        public async Task<IActionResult> GetActivity()
        {
            var recentApprovals = await _context.TemplateVersions
                .Include(v => v.Template)
                .Where(v => v.Status == TemplateStatus.InReview || v.Status == TemplateStatus.Approved || v.Status == TemplateStatus.Rejected)
                .OrderByDescending(v => v.CreatedAt)
                .Take(5)
                .Select(v => new DashboardFeedItemDto
                {
                    Id = v.Id.ToString(),
                    Type = "approval",
                    Title = $"{v.Template!.Code} v{v.VersionNumber}",
                    Subtitle = v.Template.Name,
                    Status = v.Status.ToString(),
                    Timestamp = v.CreatedAt,
                    Href = $"/templates/{v.TemplateId}"
                })
                .ToListAsync();

            var recentPrintIntents = await _context.PrintIntents
                .Include(pi => pi.Product)
                .Include(pi => pi.Template)
                .OrderByDescending(pi => pi.CreatedAt)
                .Take(5)
                .Select(pi => new DashboardFeedItemDto
                {
                    Id = pi.Id.ToString(),
                    Type = "print-intent",
                    Title = pi.Product!.Name,
                    Subtitle = $"{pi.Template!.Code} x {pi.Quantity}",
                    Status = pi.Status,
                    Timestamp = pi.CreatedAt,
                    Href = $"/print-intents/{pi.Id}"
                })
                .ToListAsync();

            var recentAuditLogs = await _context.AuditLogs
                .OrderByDescending(a => a.Timestamp)
                .Take(8)
                .ToListAsync();

            var recentAuditItems = recentAuditLogs
                .Select(a => new DashboardFeedItemDto
                {
                    Id = a.Id.ToString(),
                    Type = "audit",
                    Title = a.Action,
                    Subtitle = a.Details,
                    Status = a.EntityType,
                    Timestamp = a.Timestamp,
                    Href = "/audit-logs",
                    Metadata = new Dictionary<string, string>
                    {
                        ["entityId"] = a.EntityId,
                        ["correlationId"] = a.CorrelationId
                    }
                })
                .ToList();

            var recentImportSummaries = await _context.AuditLogs
                .Where(a => EF.Functions.ILike(a.Action, "%Import%"))
                .OrderByDescending(a => a.Timestamp)
                .Take(5)
                .Select(a => new DashboardFeedItemDto
                {
                    Id = a.Id.ToString(),
                    Type = "import",
                    Title = a.Action,
                    Subtitle = a.Details,
                    Status = "Import",
                    Timestamp = a.Timestamp,
                    Href = "/products/import"
                })
                .ToListAsync();

            var activity = new DashboardActivityDto
            {
                RecentApprovals = recentApprovals,
                RecentPrintIntents = recentPrintIntents,
                RecentAuditItems = recentAuditItems,
                RecentImportSummaries = recentImportSummaries
            };

            return Ok(new { success = true, data = activity });
        }
    }
}
