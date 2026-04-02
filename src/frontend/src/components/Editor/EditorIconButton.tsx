"use client";

import { Icon } from "@phosphor-icons/react";

type Tone = "default" | "danger" | "primary" | "info";

export function EditorCommandButton({
  icon: IconComponent,
  label,
  onClick,
  disabled = false,
  tone = "default",
}: {
  icon: Icon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: Tone;
}) {
  const toneClass = tone === "danger"
    ? "border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/15"
    : tone === "primary"
      ? "border-blue-400/20 bg-blue-500/10 text-blue-100 hover:bg-blue-500/15"
      : tone === "info"
        ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
      : "border-[color:var(--plms-border)] bg-white/[0.02] text-[color:var(--plms-text-muted)] hover:bg-white/[0.06] hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
      title={label}
      aria-label={label}
    >
      <IconComponent size={16} weight="bold" />
      <span className="hidden whitespace-nowrap xl:inline">{label}</span>
    </button>
  );
}

export function EditorToolButton({
   icon: IconComponent,
   label,
   active = false,
   onClick,
}: {
  icon: Icon;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  const finalAriaLabel = label;

  return (
    <div className="group relative flex w-full justify-center">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${active ? "border-blue-400/30 bg-blue-500/10 text-white" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] text-[color:var(--plms-text-subtle)] hover:bg-white/5 hover:text-white"}`}
        aria-label={finalAriaLabel}
        aria-pressed={active}
        title={label}
      >
        <IconComponent size={18} weight={active ? "fill" : "bold"} aria-hidden="true" />
      </button>
      <div className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border border-[color:var(--plms-border)] bg-[#13233b] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white opacity-0 shadow-[0_12px_32px_rgba(2,6,23,0.35)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden="true">
        {label}
      </div>
    </div>
  );
}
