"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { DashboardActivity, DashboardSummary } from "@/types/dashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActivityFeed } from "@/components/ui/ActivityFeed";

const emptyActivity: DashboardActivity = {
    recentApprovals: [],
    recentPrintIntents: [],
    recentAuditItems: [],
    recentImportSummaries: [],
};

export default function HomePage() {
    const { t } = useI18n();
    const { data: session, status } = useSession();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [activity, setActivity] = useState<DashboardActivity>(emptyActivity);
    const [loading, setLoading] = useState(true);

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
                    setActivity(activityRes.data);
                }
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [session]);

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

    if (!session) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
                <div className="w-full rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-10 text-center shadow-[0_25px_90px_rgba(15,23,42,0.3)]">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[color:var(--plms-text-subtle)]">
                        {t("dashboard.shell")}
                    </div>
                    <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] text-white">
                        {t("dashboard.unauthTitle")}
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-sm font-medium text-[color:var(--plms-text-subtle)]">
                        {t("dashboard.unauthDescription")}
                    </p>
                    <button className="plms-button-primary mt-8" onClick={() => signIn()}>
                        {t("dashboard.signIn")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <PageHeader
                eyebrow={t("dashboard.eyebrow")}
                title={t("dashboard.title")}
                description={t("dashboard.description")}
            />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={t("dashboard.metrics.products")} value={summary?.totalProducts ?? 0} hint={t("dashboard.metrics.activeProducts", undefined, { count: summary?.activeProducts ?? 0 })} accent="primary" />
                <MetricCard label={t("dashboard.metrics.publishedTemplates")} value={summary?.publishedTemplates ?? 0} hint={t("dashboard.metrics.drafts", undefined, { count: summary?.draftTemplates ?? 0 })} accent="success" />
                <MetricCard label={t("dashboard.metrics.pendingApprovals")} value={summary?.pendingApprovals ?? 0} hint={t("dashboard.metrics.reviewerWorkload")} accent="warning" />
                <MetricCard label={t("dashboard.metrics.pendingPrintIntents")} value={summary?.pendingPrintIntents ?? 0} hint={t("dashboard.metrics.importEvents", undefined, { count: summary?.recentImportCount ?? 0 })} accent="neutral" />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <ActivityFeed title={t("dashboard.feeds.recentApprovals")} items={activity.recentApprovals} />
                <ActivityFeed title={t("dashboard.feeds.recentPrintIntents")} items={activity.recentPrintIntents} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <ActivityFeed title={t("dashboard.feeds.auditActivity")} items={activity.recentAuditItems} />
                <ActivityFeed title={t("dashboard.feeds.importSummaries")} items={activity.recentImportSummaries} />
            </div>
        </div>
    );
}
