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
    ? "border-bad/20 bg-bad/10 text-bad hover:bg-bad/15"
    : tone === "primary"
      ? "border-accent/20 bg-accent/10 text-accent hover:bg-accent/15"
      : tone === "info"
        ? "border-accent/20 bg-accent/10 text-accent hover:bg-accent/15"
      : "border-line bg-raised text-ink-2 hover:bg-raised hover:text-ink";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
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
  return (
    <div className="group relative flex w-full justify-center">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${active ? "border-accent/30 bg-accent/10 text-ink" : "border-line bg-raised text-ink-3 hover:bg-raised hover:text-ink"}`}
        aria-label={label}
      >
        <IconComponent size={18} weight={active ? "fill" : "bold"} />
      </button>
      <div className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </div>
    </div>
  );
}
