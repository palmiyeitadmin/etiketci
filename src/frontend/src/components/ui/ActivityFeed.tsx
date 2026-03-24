"use client";

import Link from "next/link";
import { DashboardFeedItem } from "@/types/dashboard";
import { useI18n } from "@/lib/i18n";
import { localizeDashboardFeedItem } from "@/lib/dashboard-feed";
import { StatusBadge } from "./StatusBadge";

function toTone(status?: string) {
    if (!status) return "neutral" as const;
    if (/(approved|published|ready|active|completed|success)/i.test(status)) return "success" as const;
    if (/(warning|pending|review|draft)/i.test(status)) return "warning" as const;
    if (/(failed|rejected|cancelled|error|archived)/i.test(status)) return "danger" as const;
    return "info" as const;
}

export function ActivityFeed({
    title,
    items,
    emptyText,
}: {
    title: string;
    items: DashboardFeedItem[];
    emptyText?: string;
}) {
    const { formatDateTime, t, locale } = useI18n();
    const localizedItems = items.map((item) => localizeDashboardFeedItem(locale, item));

    return (
        <section className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">{title}</h2>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                    {items.length} {t("common.items")}
                </span>
            </div>
            <div className="space-y-3">
                {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[color:var(--plms-border-strong)] px-4 py-8 text-center text-sm font-medium text-[color:var(--plms-text-subtle)]">
                        {emptyText || t("activity.empty")}
                    </div>
                ) : (
                    localizedItems.map((item) => {
                        const content = (
                            <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-4 transition-colors hover:border-blue-400/30 hover:bg-white/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="truncate text-sm font-bold text-white" title={item.title}>{item.title}</div>
                                        {item.subtitle ? (
                                            <p className="truncate text-xs font-medium text-[color:var(--plms-text-subtle)]" title={item.subtitle}>{item.subtitle}</p>
                                        ) : null}
                                    </div>
                                    {item.status ? <StatusBadge label={item.status} tone={toTone(item.status)} /> : null}
                                </div>
                                <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                                    {formatDateTime(item.timestamp)}
                                </div>
                            </div>
                        );

                        return item.href ? (
                            <Link key={item.id} href={item.href}>
                                {content}
                            </Link>
                        ) : (
                            <div key={item.id}>{content}</div>
                        );
                    })
                )}
            </div>
        </section>
    );
}
