"use client";

import Link from "next/link";
import {
  CaretDown,
  CaretUp,
  ArrowRight,
  Files,
  Users,
  Images,
  Stamp,
  Package,
  UserPlus,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import { localizeDashboardFeedItem } from "@/lib/dashboard-feed";
import { DashboardActivity, DashboardSummary } from "@/types/dashboard";
import { Portal } from "@/components/ui/Portal";

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
  const { formatTime, t, locale } = useI18n();
  const latestAudit = activity?.recentAuditItems?.[0]
    ? localizeDashboardFeedItem(locale, activity.recentAuditItems[0])
    : null;

  const text =
    locale === "tr"
      ? {
          templates: "Şablon",
          users: "Kullanıcı",
          assets: "Varlık",
          roles: "Roller",
          pending: "Onay Bekleyen",
          categories: "Kategoriler",
          todayAudits: "Günlük İşlem",
          latestUser: "Son Kullanıcı",
          shortcuts: "Kısayollar",
          library: "Kütüphane",
          userMgmt: "Kullanıcılar",
          latestSignal: "Son İşlem",
          auditLogs: "Denetim Kayıtları",
        }
      : {
          templates: "Templates",
          users: "Users",
          assets: "Assets",
          roles: "Roles",
          pending: "Pending Approval",
          categories: "Categories",
          todayAudits: "Daily Activity",
          latestUser: "Latest User",
          shortcuts: "Shortcuts",
          library: "Library",
          userMgmt: "Users",
          latestSignal: "Latest Activity",
          auditLogs: "Audit Logs",
        };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-[260px] items-center gap-3 rounded-[1.2rem] border border-[color:var(--plms-border)] bg-[linear-gradient(180deg,rgba(16,27,45,0.98),rgba(10,20,35,0.98))] px-3 py-2 text-left shadow-[0_18px_50px_rgba(3,8,20,0.28)] transition-colors hover:bg-white/[0.04]"
        aria-label={expanded ? t("pulse.collapse") : t("pulse.expand")}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
              {t("pulse.title")}
            </span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
              {t("pulse.active")}
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-white/80">
            A:{summary?.pendingApprovals ?? 0} R:
            {summary?.totalRoles ?? 0} H:
            {summary?.todayAuditLogsCount ?? 0}
            <span className="ml-2 text-[color:var(--plms-text-subtle)]">
              {latestAudit?.title || t("pulse.noRecentActivity")}
            </span>
          </div>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--plms-border)] bg-white/[0.03] text-[color:var(--plms-text-subtle)]">
          {expanded ? (
            <CaretUp size={16} weight="bold" />
          ) : (
            <CaretDown size={16} weight="bold" />
          )}
        </span>
      </button>

      {expanded ? (
        <Portal>
          <div
            className="fixed inset-0 z-[55] bg-slate-950/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
            onClick={onToggle}
          />
          <div
            className="fixed inset-x-4 top-20 z-[56] mx-auto max-w-lg md:fixed md:inset-x-auto md:top-[76px] md:right-6 md:mx-0 md:w-[460px] md:max-w-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[linear-gradient(160deg,rgba(14,25,43,0.99),rgba(8,17,31,0.99))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.6)]">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                    {t("pulse.title")}
                  </div>
                  <div className="mt-1 text-sm font-bold text-white">
                    {t("pulse.livePosture")}
                  </div>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                  {t("pulse.active")}
                </div>
              </div>

              {/* Main metrics grid */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MetricCard
                  icon={Files}
                  label={text.templates}
                  value={summary?.totalTemplates ?? 0}
                  gradient="from-blue-500/20 to-blue-600/5"
                  borderColor="border-blue-400/20"
                  textColor="text-blue-100"
                  iconColor="text-blue-300"
                />
                <MetricCard
                  icon={Users}
                  label={text.users}
                  value={summary?.totalUsers ?? 0}
                  gradient="from-violet-500/20 to-violet-600/5"
                  borderColor="border-violet-400/20"
                  textColor="text-violet-100"
                  iconColor="text-violet-300"
                />
                <MetricCard
                  icon={Images}
                  label={text.assets}
                  value={summary?.totalAssets ?? 0}
                  gradient="from-cyan-500/20 to-cyan-600/5"
                  borderColor="border-cyan-400/20"
                  textColor="text-cyan-100"
                  iconColor="text-cyan-300"
                />
                <MetricCard
                  icon={Stamp}
                  label={text.roles}
                  value={summary?.totalRoles ?? 0}
                  gradient="from-emerald-500/20 to-emerald-600/5"
                  borderColor="border-emerald-400/20"
                  textColor="text-emerald-100"
                  iconColor="text-emerald-300"
                />
              </div>

              {/* Status row: approvals, queue, imports */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatusPill
                  label={text.pending}
                  value={summary?.pendingApprovals ?? 0}
                  tone="warning"
                />
                <StatusPill
                  label={text.categories}
                  value={summary?.totalTemplateCategories ?? 0}
                  tone="primary"
                />
                <StatusPill
                  label={text.todayAudits}
                  value={summary?.todayAuditLogsCount ?? 0}
                  tone="success"
                />
              </div>

              {/* Latest user */}
              {summary?.latestUserName ? (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-violet-400/15 bg-gradient-to-r from-violet-500/10 to-transparent px-3.5 py-2.5">
                  <UserPlus
                    size={16}
                    weight="bold"
                    className="shrink-0 text-violet-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300/80">
                      {text.latestUser}
                    </div>
                    <div className="truncate text-sm font-bold text-white">
                      {summary.latestUserName}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Latest signal */}
              <div className="mt-3 rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ClockCounterClockwise
                      size={14}
                      weight="bold"
                      className="text-blue-300"
                    />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">
                      {text.latestSignal}
                    </span>
                  </div>
                  {latestAudit ? (
                    <span className="text-[10px] font-bold text-blue-200">
                      {formatTime(latestAudit.timestamp)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 truncate text-sm font-semibold text-white">
                  {latestAudit?.title || t("pulse.noRecentActivity")}
                </div>
                <div className="mt-0.5 truncate text-xs text-[color:var(--plms-text-subtle)]">
                  {latestAudit?.subtitle || t("pulse.emptySubtitle")}
                </div>
              </div>

              {/* Shortcut buttons */}
              <div className="mt-4">
                <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                  {text.shortcuts}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <ShortcutLink
                    href="/templates"
                    icon={Files}
                    label={t("nav.templates")}
                  />
                  <ShortcutLink
                    href="/admin/categories"
                    icon={Package}
                    label={text.categories}
                  />
                  <ShortcutLink
                    href="/admin/audit-logs"
                    icon={ClockCounterClockwise}
                    label={text.auditLogs}
                  />
                  <ShortcutLink
                    href="/library"
                    icon={Images}
                    label={text.library}
                  />
                  <ShortcutLink
                    href="/admin/users"
                    icon={Users}
                    label={text.userMgmt}
                  />
                  <ShortcutLink
                    href="/admin/roles"
                    icon={Stamp}
                    label={text.roles}
                  />
                </div>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────── */

function MetricCard({
  icon: Icon,
  label,
  value,
  gradient,
  borderColor,
  textColor,
  iconColor,
}: {
  icon: any;
  label: string;
  value: number;
  gradient: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-b ${gradient} ${borderColor} px-3 py-2.5`}
    >
      <Icon size={18} weight="duotone" className={`${iconColor}`} />
      <div className={`mt-1.5 text-xl font-black tracking-[-0.04em] ${textColor}`}>
        {value}
      </div>
      <div className="text-[9px] font-black uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
        : "border-blue-400/20 bg-blue-500/10 text-blue-100";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.16em] opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-black tracking-[-0.04em]">
        {value}
      </div>
    </div>
  );
}

function ShortcutLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: any;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-xl border border-[color:var(--plms-border)] bg-white/[0.02] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--plms-text-muted)] transition-all hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white"
    >
      <Icon
        size={14}
        weight="bold"
        className="shrink-0 text-[color:var(--plms-text-subtle)] transition-colors group-hover:text-blue-300"
      />
      <span className="min-w-0 truncate">{label}</span>
      <ArrowRight
        size={12}
        weight="bold"
        className="ml-auto shrink-0 text-[color:var(--plms-text-subtle)] opacity-0 transition-all group-hover:text-blue-300 group-hover:opacity-100"
      />
    </Link>
  );
}
