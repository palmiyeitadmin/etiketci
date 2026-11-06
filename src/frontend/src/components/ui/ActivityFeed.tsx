"use client";

import Link from "next/link";
import { DashboardFeedItem } from "@/types/dashboard";
import { useI18n } from "@/lib/i18n";
import { localizeDashboardFeedItem } from "@/lib/dashboard-feed";
import { StatusBadge } from "./StatusBadge";

function toTone(status?: string) {
    if (!status) return "neutral" as const;
    if (/(approved|published|ready|active|completed|success|printed)/i.test(status)) return "success" as const;
    if (/(warning|pending|review|draft)/i.test(status)) return "warning" as const;
    if (/(failed|rejected|cancelled|error|archived)/i.test(status)) return "danger" as const;
    return "info" as const;
}

/** A compact list: one row per item, time on the right in mono. */
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
        <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface">
            <div className="flex h-12 items-center justify-between border-b border-line px-4">
                <h2 className="text-base font-medium text-ink">{title}</h2>
                <span className="tabular font-mono text-xs text-ink-3">{items.length}</span>
            </div>
            {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-3">{emptyText || t("activity.empty")}</p>
            ) : (
                <ul className="divide-y divide-line">
                    {localizedItems.map((item) => {
                        const content = (
                            <div className="flex items-center gap-3 px-4 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-base text-ink" title={item.title}>{item.title}</div>
                                    {item.subtitle ? (
                                        <div className="truncate text-sm text-ink-3" title={item.subtitle}>{item.subtitle}</div>
                                    ) : null}
                                </div>
                                {item.status ? <StatusBadge label={item.status} tone={toTone(item.status)} /> : null}
                                <time className="tabular shrink-0 font-mono text-xs text-ink-3" dateTime={item.timestamp}>
                                    {formatDateTime(item.timestamp, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </time>
                            </div>
                        );

                        return (
                            <li key={item.id}>
                                {item.href ? (
                                    <Link href={item.href} className="block transition-colors hover:bg-raised">{content}</Link>
                                ) : content}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
