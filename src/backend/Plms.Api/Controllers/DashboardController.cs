using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
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
        private readonly UserManager<ApplicationUser> _userManager;

        public DashboardController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var today = DateTime.UtcNow.Date;
            var sevenDaysAgo = today.AddDays(-6);

            var summary = new DashboardSummaryDto
            {
                TotalProducts = await _context.Products.CountAsync(),
                ActiveProducts = await _context.Products.CountAsync(p => p.IsActive),
                PublishedTemplates = await _context.TemplateVersions.CountAsync(v => v.Status == TemplateStatus.Published),
                DraftTemplates = await _context.TemplateVersions.CountAsync(v => v.Status == TemplateStatus.Draft),
                PendingApprovals = await _context.TemplateVersions.CountAsync(v => v.Status == TemplateStatus.InReview),
                TotalTemplates = await _context.Templates.CountAsync(),
                TotalUsers = await _userManager.Users.CountAsync(),
                LatestUserName = await _userManager.Users.OrderByDescending(u => u.CreatedAt).Select(u => u.FullName ?? u.UserName).FirstOrDefaultAsync(),
                TotalAssets = await _context.ContentAssets.CountAsync(),
                TotalTemplateCategories = await _context.TemplateCategories.CountAsync(),
                TotalRoles = await _context.Roles.CountAsync(),
                TodayAuditLogsCount = await _context.AuditLogs.CountAsync(a => a.Timestamp >= today)
            };

            var recentAuditsDates = await _context.AuditLogs
                .Where(a => a.Timestamp >= sevenDaysAgo)
                .Select(a => a.Timestamp)
                .ToListAsync();

            var recentTemplatesDates = await _context.Templates
                .Where(t => t.CreatedAt >= sevenDaysAgo)
                .Select(t => t.CreatedAt)
                .ToListAsync();

            var chartData = new List<WeeklyActivityChartItemDto>();
            for (int i = 0; i < 7; i++)
            {
                var targetDate = sevenDaysAgo.AddDays(i).Date;
                chartData.Add(new WeeklyActivityChartItemDto
                {
                    DateString = targetDate.ToString("MMM dd"),
                    AuditCount = recentAuditsDates.Count(d => d.Date == targetDate),
                    TemplateCount = recentTemplatesDates.Count(d => d.Date == targetDate)
                });
            }

            summary.WeeklyActivity = chartData;
            return Ok(new { success = true, data = summary });
        }

        [HttpGet("activity")]
        public async Task<IActionResult> GetActivity()
        {
            var recentTemplates = await _context.TemplateVersions
                .Include(v => v.Template)
                .Where(v => v.VersionNumber == 1)
                .OrderByDescending(v => v.CreatedAt)
                .Take(5)
                .Select(v => new DashboardFeedItemDto
                {
                    Id = v.Id.ToString(),
                    Type = "template",
                    Title = v.Template!.Name,
                    Subtitle = $"{v.Template.Code} (v{v.VersionNumber})",
                    Status = v.Status.ToString(),
                    Timestamp = v.CreatedAt,
                    Href = $"/templates/{v.TemplateId}"
                })
                .ToListAsync();

            var recentUsersList = await _userManager.Users
                .OrderByDescending(u => u.CreatedAt)
                .Take(5)
                .ToListAsync();

            var recentUsers = recentUsersList
                .Select(u => new DashboardFeedItemDto
                {
                    Id = u.Id.ToString(),
                    Type = "user",
                    Title = u.FullName ?? u.UserName ?? "Unknown User",
                    Subtitle = u.Email,
                    Status = "User",
                    Timestamp = u.CreatedAt,
                    Href = $"/admin/users"
                })
                .ToList();

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

            var activity = new DashboardActivityDto
            {
                RecentTemplates = recentTemplates,
                RecentUsers = recentUsers,
                RecentAuditItems = recentAuditItems
            };

            return Ok(new { success = true, data = activity });
        }
    }
}
