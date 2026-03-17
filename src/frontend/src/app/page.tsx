"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
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
                        Loading operational dashboard
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
                        Epson Operations Shell
                    </div>
                    <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] text-white">
                        Unified PLMS Dashboard
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-sm font-medium text-[color:var(--plms-text-subtle)]">
                        Govern products, templates, approvals, imports and print intents through a single operational
                        control surface.
                    </p>
                    <button className="plms-button-primary mt-8" onClick={() => signIn()}>
                        Sign In to Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <PageHeader
                eyebrow="Unified operations"
                title="Operational Dashboard"
                description="System-wide production posture across product governance, template lifecycle, print intents and audit activity."
            />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Products" value={summary?.totalProducts ?? 0} hint={`${summary?.activeProducts ?? 0} active`} accent="primary" />
                <MetricCard label="Published templates" value={summary?.publishedTemplates ?? 0} hint={`${summary?.draftTemplates ?? 0} drafts`} accent="success" />
                <MetricCard label="Pending approvals" value={summary?.pendingApprovals ?? 0} hint="Reviewer workload" accent="warning" />
                <MetricCard label="Pending print intents" value={summary?.pendingPrintIntents ?? 0} hint={`${summary?.recentImportCount ?? 0} import events / 7d`} accent="neutral" />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <ActivityFeed title="Recent approvals" items={activity.recentApprovals} />
                <ActivityFeed title="Recent print intents" items={activity.recentPrintIntents} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <ActivityFeed title="Audit activity" items={activity.recentAuditItems} />
                <ActivityFeed title="Recent import summaries" items={activity.recentImportSummaries} />
            </div>
        </div>
    );
}
