"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { DashboardActivity, DashboardSummary } from "@/types/dashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

const emptyActivity: DashboardActivity = {
    recentTemplates: [],
    recentUsers: [],
    recentAuditItems: [],
    favoriteTemplates: [],
};

export default function HomePage() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [activity, setActivity] = useState<DashboardActivity>(emptyActivity);
    const [loading, setLoading] = useState(true);

    const translations = locale === "tr" ? {
        templates: "Sablonlar",
        assets: "Kutuphane",
        categories: "Kategoriler",
        users: "Kullanicilar",
        roles: "Roller",
        auditTitle: "Sistem Hareket Trendi (7 Gun)",
        auditLegend: "Denetim Kaydi",
        templateLegend: "Yeni Sablon",
        recentTemplates: "Son Sablonlar",
        recentUsers: "Son Kullanicilar",
        auditActivity: "Denetim Hareketleri",
        todayAudits: "Bugunku Islem",
        favoriteTemplates: "Favori Sablonlar",
        noFavoriteTemplates: "Henuz favori sablon yok."
    } : {
        templates: "Templates",
        assets: "Library",
        categories: "Categories",
        users: "Users",
        roles: "Roles",
        auditTitle: "System Activity Trend (7 Days)",
        auditLegend: "Audit Log",
        templateLegend: "New Template",
        recentTemplates: "Recent Templates",
        recentUsers: "Recent Users",
        auditActivity: "Audit Activity",
        todayAudits: "Today's Activity",
        favoriteTemplates: "Favorite Templates",
        noFavoriteTemplates: "No favorite templates yet."
    };

    useEffect(() => {
        if (!session) {
            setLoading(false);
            return;
        }

        async function load() {
            try {
                const [summaryRes, activityRes] = await Promise.all([
                    apiFetch<DashboardSummary>("/api/dashboard/summary"),
                    apiFetch<DashboardActivity>("/api/dashboard/activity"),
                ]);

                if (summaryRes.success) {
                    setSummary(summaryRes.data);
                }

                if (activityRes.success) {
                    setActivity({
                        recentTemplates: activityRes.data.recentTemplates || [],
                        recentUsers: activityRes.data.recentUsers || [],
                        recentAuditItems: activityRes.data.recentAuditItems || [],
                        favoriteTemplates: activityRes.data.favoriteTemplates || [],
                    });
                }
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [session]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/auth/login?callbackUrl=%2F");
        }
    }, [router, status]);

    if (status === "loading" || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
                    <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                        {t("dashboard.loading")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-10">
            <PageHeader
                eyebrow={t("dashboard.eyebrow")}
                title={t("dashboard.title")}
                description={t("dashboard.description")}
            />

            {/* METRICS GRID */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <MetricCard label={translations.templates} value={summary?.totalTemplates ?? 0} hint={t("dashboard.metrics.drafts", undefined, { count: summary?.draftTemplates ?? 0 })} accent="primary" />
                <MetricCard label={translations.assets} value={summary?.totalAssets ?? 0} hint="Digital Assets" accent="success" />
                <MetricCard label={translations.categories} value={summary?.totalTemplateCategories ?? 0} hint="Organization" accent="warning" />
                <MetricCard label={translations.todayAudits} value={summary?.todayAuditLogsCount ?? 0} hint="Actions Today" accent="neutral" />
                <MetricCard label={translations.users} value={summary?.totalUsers ?? 0} hint={summary?.latestUserName || ""} accent="primary" />
                <MetricCard label={translations.roles} value={summary?.totalRoles ?? 0} hint="Security Groups" accent="success" />
            </div>

            {/* CHARTS SECTION */}
            <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
                <div className="mb-6">
                   <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">{translations.auditTitle}</h2>
                </div>
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={summary?.weeklyActivity || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAudit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorTemplate" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                                dataKey="dateString" 
                                stroke="#64748b" 
                                fontSize={10} 
                                fontWeight="bold" 
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis 
                                stroke="#64748b" 
                                fontSize={10} 
                                fontWeight="bold" 
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                            />
                            <Area type="monotone" dataKey="auditCount" name={translations.auditLegend} stroke="#3b82f6" fillOpacity={1} fill="url(#colorAudit)" strokeWidth={3} />
                            <Area type="monotone" dataKey="templateCount" name={translations.templateLegend} stroke="#10b981" fillOpacity={1} fill="url(#colorTemplate)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* FEEDS GRID */}
            <div className="grid gap-6 xl:grid-cols-3">
                <ActivityFeed title={translations.recentTemplates} items={activity.recentTemplates} />
                <ActivityFeed title={translations.recentUsers} items={activity.recentUsers} />
                <ActivityFeed title={translations.favoriteTemplates} items={activity.favoriteTemplates} emptyText={translations.noFavoriteTemplates} />
            </div>

            <div>
                <ActivityFeed title={translations.auditActivity} items={activity.recentAuditItems} />
            </div>
        </div>
    );
}
