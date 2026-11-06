namespace Plms.Api.DTOs.Dashboard
{
    public class DashboardSummaryDto
    {
        public int TotalProducts { get; set; }
        public int ActiveProducts { get; set; }
        public int PublishedTemplates { get; set; }
        public int DraftTemplates { get; set; }
        public int PendingApprovals { get; set; }
        public int PendingPrintIntents { get; set; }
        public int RecentImportCount { get; set; }
        public int TotalTemplates { get; set; }
        public int TotalUsers { get; set; }
        public string? LatestUserName { get; set; }
        public int TotalAssets { get; set; }
        public int TotalTemplateCategories { get; set; }
        public int TotalRoles { get; set; }
        public int TodayAuditLogsCount { get; set; }
        public List<WeeklyActivityChartItemDto> WeeklyActivity { get; set; } = new();

        // Print operations (labels = sum of quantities).
        public int LabelsPrintedToday { get; set; }
        public int LabelsPrintedYesterday { get; set; }
        public int FailedPrintsToday { get; set; }
        public int AwaitingOutcome { get; set; }
        public List<DailyPrintItemDto> DailyPrints { get; set; } = new();
    }

    public class DailyPrintItemDto
    {
        /// <summary>UTC date, yyyy-MM-dd.</summary>
        public string Date { get; set; } = string.Empty;
        public int Labels { get; set; }
        public int Jobs { get; set; }
        public int Failed { get; set; }
    }

    public class WeeklyActivityChartItemDto
    {
        public string DateString { get; set; } = string.Empty;
        public int AuditCount { get; set; }
        public int TemplateCount { get; set; }
    }

    public class DashboardFeedItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Subtitle { get; set; }
        public string? Status { get; set; }
        public DateTime Timestamp { get; set; }
        public string? Href { get; set; }
        public Dictionary<string, string> Metadata { get; set; } = new();
    }

    public class DashboardActivityDto
    {
        public List<DashboardFeedItemDto> RecentTemplates { get; set; } = new();
        public List<DashboardFeedItemDto> RecentUsers { get; set; } = new();
        public List<DashboardFeedItemDto> RecentAuditItems { get; set; } = new();
        public List<DashboardFeedItemDto> FavoriteTemplates { get; set; } = new();
    }
}
