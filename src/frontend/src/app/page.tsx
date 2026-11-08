"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "@/lib/api-client";
import { useI18n, useText } from "@/lib/i18n";
import { DashboardActivity, DashboardSummary } from "@/types/dashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActivityFeed } from "@/components/ui/ActivityFeed";

const emptyActivity: DashboardActivity = {
    recentTemplates: [],
    recentUsers: [],
    recentAuditItems: [],
    favoriteTemplates: [],
};

// Chart colors mirror the CSS tokens (SVG attributes cannot read CSS variables).
const CHART = { accent: "#0e7490", bar: "#d4d4d8", grid: "#ececee", label: "#6b6b70" };

export default function HomePage() {
    const { formatDate, formatNumber } = useI18n();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [activity, setActivity] = useState<DashboardActivity>(emptyActivity);
    const [loading, setLoading] = useState(true);

    const text = useText("dashboard").home;

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

    const chartData = useMemo(() => {
        const days = summary?.dailyPrints ?? [];
        return days.map((day, index) => ({
            ...day,
            isToday: index === days.length - 1,
            label: formatDate(`${day.date}T00:00:00`, { day: "2-digit", month: "2-digit" }),
        }));
    }, [summary, formatDate]);
    const chartTotal = chartData.reduce((sum, day) => sum + day.labels, 0);

    if (status === "loading" || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-ink-2">
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                {text.loading}
            </div>
        );
    }

    const printedToday = summary?.labelsPrintedToday ?? 0;
    const printedYesterday = summary?.labelsPrintedYesterday ?? 0;
    const awaiting = summary?.awaitingOutcome ?? 0;
    const pendingApprovals = summary?.pendingApprovals ?? 0;

    return (
        <div className="flex flex-col gap-6 pb-10">
            <PageHeader
                title={text.title}
                description={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                actions={(
                    <>
                        <Link href="/templates/new" className="plms-button-secondary">{text.newTemplate}</Link>
                        <Link href="/print-intents/new" className="plms-button-primary">{text.newPrint}</Link>
                    </>
                )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label={text.printedToday}
                    value={formatNumber(printedToday)}
                    hint={text.vsYesterday(printedToday - printedYesterday)}
                    href="/print-intents"
                />
                <MetricCard
                    label={text.awaitingOutcome}
                    value={formatNumber(awaiting)}
                    hint={text.awaitingHint(awaiting)}
                    accent={awaiting > 0 ? "warning" : "neutral"}
                    href="/print-intents"
                />
                <MetricCard
                    label={text.openRequests}
                    value={formatNumber(summary?.pendingPrintIntents ?? 0)}
                    hint={text.openHint}
                    href="/print-intents"
                />
                <MetricCard
                    label={text.pendingApprovals}
                    value={formatNumber(pendingApprovals)}
                    hint={text.approvalsHint(pendingApprovals)}
                    accent={pendingApprovals > 0 ? "primary" : "neutral"}
                    href="/approvals"
                />
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface xl:col-span-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
                        <div>
                            <h2 className="text-base font-medium text-ink">{text.chartTitle}</h2>
                            <p className="text-sm text-ink-3">{text.chartSubtitle}</p>
                        </div>
                        <span className="tabular font-mono text-xs text-ink-3">{text.chartTotal(chartTotal)}</span>
                    </div>
                    <div className="h-[300px] w-full px-2 pb-3 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
                                <CartesianGrid stroke={CHART.grid} vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: CHART.label, fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
                                    interval={0}
                                    dy={6}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                    width={44}
                                    tick={{ fill: CHART.label, fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
                                    tickFormatter={(value: number) => formatNumber(value)}
                                />
                                <Tooltip
                                    cursor={{ fill: "rgba(23,23,23,0.04)" }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const day = payload[0].payload as (typeof chartData)[number];
                                        return (
                                            <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-pop">
                                                <div className="font-mono text-xs text-ink-3">{day.label}</div>
                                                <div className="tabular text-ink">{formatNumber(day.labels)} {text.labels}</div>
                                                <div className="tabular text-ink-3">{day.jobs} {text.jobs}{day.failed ? ` · ${day.failed} ${text.failed}` : ""}</div>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar dataKey="labels" radius={[3, 3, 0, 0]} maxBarSize={36}>
                                    {chartData.map((day) => (
                                        <Cell key={day.date} fill={day.isToday ? CHART.accent : CHART.bar} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <ActivityFeed title={text.favorites} items={activity.favoriteTemplates} emptyText={text.noFavorites} />
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <ActivityFeed title={text.recentTemplates} items={activity.recentTemplates.slice(0, 6)} />
                <ActivityFeed title={text.recentActivity} items={activity.recentAuditItems.slice(0, 6)} />
            </div>
        </div>
    );
}
