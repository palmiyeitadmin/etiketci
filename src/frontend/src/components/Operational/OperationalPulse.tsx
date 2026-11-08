"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import { localizeDashboardFeedItem } from "@/lib/dashboard-feed";
import { DashboardActivity, DashboardSummary } from "@/types/dashboard";
import { Portal } from "@/components/ui/Portal";

/**
 * Compact status in the top bar: says in words what is waiting (approvals, prints without an outcome),
 * and opens a small panel with today's numbers, the latest activity and shortcuts.
 */
export function OperationalPulse({
  summary,
  activity,
  expanded,
  onToggle,
}: {
  summary: DashboardSummary | null;
  activity: DashboardActivity | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { formatTime, formatNumber, t, locale } = useI18n();
  const awaitingOutcome = summary?.awaitingOutcome ?? 0;
  const pendingApprovals = summary?.pendingApprovals ?? 0;
  const latest = (activity?.recentAuditItems ?? []).slice(0, 4).map((item) => localizeDashboardFeedItem(locale, item));

  const headline = awaitingOutcome > 0
    ? t("pulse.waitingOutcome", undefined, { count: awaitingOutcome })
    : pendingApprovals > 0
      ? t("pulse.waitingApproval", undefined, { count: pendingApprovals })
      : t("pulse.allClear");
  const tone = awaitingOutcome > 0 ? "bg-warn" : pendingApprovals > 0 ? "bg-accent" : "bg-good";

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onToggle();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, onToggle]);

  const stats = [
    { label: t("pulse.printedToday"), value: summary?.labelsPrintedToday ?? 0, href: "/print-intents" },
    { label: t("pulse.openRequests"), value: (summary?.pendingPrintIntents ?? 0) + awaitingOutcome, href: "/print-intents" },
    { label: t("pulse.pendingApprovals"), value: pendingApprovals, href: "/approvals" },
    { label: t("pulse.actionsToday"), value: summary?.todayAuditLogsCount ?? 0, href: "/audit-logs" },
  ];

  const shortcuts = [
    { href: "/print-intents/new", label: t("nav.printIntents") },
    { href: "/templates", label: t("nav.templates") },
    { href: "/products", label: t("nav.products") },
    { href: "/audit-logs", label: t("nav.auditLogs") },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex h-8 max-w-[16rem] items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        aria-label={expanded ? t("pulse.collapse") : t("pulse.expand")}
      >
        <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
        <span className="hidden truncate md:inline">{headline}</span>
        <CaretDown size={14} className={`shrink-0 text-ink-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <Portal>
          <div className="fixed inset-0 z-[55]" onClick={onToggle} />
          <div
            role="dialog"
            aria-label={t("pulse.title")}
            className="fixed inset-x-4 top-16 z-[56] mx-auto flex max-w-md flex-col rounded-xl border border-line bg-surface shadow-pop md:left-auto md:right-6 md:mx-0 md:w-[400px]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-base font-medium text-ink">{t("pulse.livePosture")}</span>
              <span className="text-sm text-ink-3">{headline}</span>
            </div>

            <dl className="grid grid-cols-2 gap-px bg-line">
              {stats.map((stat) => (
                <Link key={stat.label} href={stat.href} onClick={onToggle} className="flex flex-col gap-0.5 bg-surface px-4 py-3 transition-colors hover:bg-raised">
                  <dt className="text-sm text-ink-2">{stat.label}</dt>
                  <dd className="tabular text-lg font-medium text-ink">{formatNumber(stat.value)}</dd>
                </Link>
              ))}
            </dl>

            <div className="border-t border-line px-4 py-3">
              <div className="mb-2 text-xs text-ink-3">{t("pulse.latestSignal")}</div>
              {latest.length === 0 ? (
                <p className="text-sm text-ink-3">{t("pulse.noRecentActivity")}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {latest.map((item) => (
                    <li key={item.id} className="flex items-baseline gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate text-ink">{item.title}</span>
                      <time className="tabular shrink-0 font-mono text-xs text-ink-3">{formatTime(item.timestamp, { hour: "2-digit", minute: "2-digit" })}</time>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3">
              {shortcuts.map((shortcut) => (
                <Link key={shortcut.href} href={shortcut.href} onClick={onToggle} className="plms-button-compact">
                  {shortcut.label}
                </Link>
              ))}
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
