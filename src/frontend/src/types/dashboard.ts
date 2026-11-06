export interface DashboardSummary {
    publishedTemplates: number;
    draftTemplates: number;
    pendingApprovals: number;
    totalTemplates: number;
    totalUsers: number;
    latestUserName: string | null;
    totalAssets: number;
    totalTemplateCategories: number;
    totalRoles: number;
    todayAuditLogsCount: number;
    weeklyActivity: WeeklyActivityChartItem[];
    totalProducts?: number;
    activeProducts?: number;
    pendingPrintIntents?: number;
    labelsPrintedToday?: number;
    labelsPrintedYesterday?: number;
    failedPrintsToday?: number;
    awaitingOutcome?: number;
    dailyPrints?: DailyPrintItem[];
}

export interface DailyPrintItem {
    /** UTC date, yyyy-MM-dd */
    date: string;
    labels: number;
    jobs: number;
    failed: number;
}

export interface WeeklyActivityChartItem {
    dateString: string;
    auditCount: number;
    templateCount: number;
}

export interface DashboardFeedItem {
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    status?: string;
    timestamp: string;
    href?: string;
    metadata?: Record<string, string>;
}

export interface DashboardActivity {
    recentTemplates: DashboardFeedItem[];
    recentUsers: DashboardFeedItem[];
    recentAuditItems: DashboardFeedItem[];
    favoriteTemplates: DashboardFeedItem[];
}
