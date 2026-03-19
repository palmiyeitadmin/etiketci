export interface DashboardSummary {
    totalProducts: number;
    activeProducts: number;
    publishedTemplates: number;
    draftTemplates: number;
    pendingApprovals: number;
    pendingPrintIntents: number;
    recentImportCount: number;
    totalTemplates: number;
    totalUsers: number;
    latestUserName: string | null;
    totalAssets: number;
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
    recentApprovals: DashboardFeedItem[];
    recentPrintIntents: DashboardFeedItem[];
    recentAuditItems: DashboardFeedItem[];
    recentImportSummaries: DashboardFeedItem[];
}
