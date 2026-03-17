"use client";

import Link from "next/link";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { DashboardActivity, DashboardSummary } from "@/types/dashboard";

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
  const latestAudit = activity?.recentAuditItems?.[0];
  const latestImport = activity?.recentImportSummaries?.[0];

  return (
    <div className="relative hidden xl:block">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-[260px] items-center gap-3 rounded-[1.2rem] border border-[color:var(--plms-border)] bg-[linear-gradient(180deg,rgba(16,27,45,0.98),rgba(10,20,35,0.98))] px-3 py-2 text-left shadow-[0_18px_50px_rgba(3,8,20,0.28)] transition-colors hover:bg-white/[0.04]"
        aria-label={expanded ? "Collapse operational pulse" : "Expand operational pulse"}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Operational Pulse</span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
              Active
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-white/80">
            A:{summary?.pendingApprovals ?? 0} Q:{summary?.pendingPrintIntents ?? 0} I:{summary?.recentImportCount ?? 0}
            <span className="ml-2 text-[color:var(--plms-text-subtle)]">
              {latestAudit?.title || latestImport?.title || "No recent activity"}
            </span>
          </div>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--plms-border)] bg-white/[0.03] text-[color:var(--plms-text-subtle)]">
          {expanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
        </span>
      </button>

      {expanded ? (
        <div className="absolute right-0 top-[calc(100%+0.6rem)] z-40 w-[340px] rounded-[1.6rem] border border-[color:var(--plms-border)] bg-[linear-gradient(180deg,rgba(16,27,45,0.98),rgba(10,20,35,0.98))] px-4 py-3 shadow-[0_18px_50px_rgba(3,8,20,0.45)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Operational Pulse</div>
              <div className="mt-1 text-sm font-bold text-white">Live production posture</div>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
              Active
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricPill label="Approvals" value={summary?.pendingApprovals ?? 0} tone="warning" />
            <MetricPill label="Queue" value={summary?.pendingPrintIntents ?? 0} tone="primary" />
            <MetricPill label="Imports" value={summary?.recentImportCount ?? 0} tone="success" />
          </div>
          <div className="mt-4 space-y-2 rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">Latest signal</div>
              {latestAudit ? <span className="text-[10px] font-bold text-blue-200">{new Date(latestAudit.timestamp).toLocaleTimeString()}</span> : null}
            </div>
            <div className="text-sm font-semibold text-white">{latestAudit?.title || latestImport?.title || "No recent activity"}</div>
            <div className="text-xs text-[color:var(--plms-text-subtle)] line-clamp-2">{latestAudit?.subtitle || latestImport?.subtitle || "Dashboard activity will appear here once events are recorded."}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Link href="/approvals" className="plms-button-compact flex-1">Open Approvals</Link>
            <Link href="/print-intents" className="plms-button-compact flex-1">Open Queue</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: number; tone: "primary" | "success" | "warning" }) {
  const toneClass = tone === "success"
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
    : tone === "warning"
      ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
      : "border-blue-400/20 bg-blue-500/10 text-blue-100";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.18em] opacity-80">{label}</div>
      <div className="mt-1 text-lg font-black tracking-[-0.04em]">{value}</div>
    </div>
  );
}
