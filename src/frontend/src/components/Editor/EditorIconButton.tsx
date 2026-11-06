"use client";

import type { ReactNode } from "react";
import { Icon } from "@phosphor-icons/react";

type TooltipSide = "bottom" | "right" | "top";
type TooltipAlign = "center" | "start" | "end";

const sideClasses: Record<TooltipSide, Record<TooltipAlign, string>> = {
  bottom: {
    center: "left-1/2 top-full mt-1.5 -translate-x-1/2",
    start: "left-0 top-full mt-1.5",
    end: "right-0 top-full mt-1.5",
  },
  top: {
    center: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    start: "bottom-full left-0 mb-1.5",
    end: "bottom-full right-0 mb-1.5",
  },
  right: {
    center: "left-full top-1/2 ml-2 -translate-y-1/2",
    start: "left-full top-0 ml-2",
    end: "bottom-0 left-full ml-2",
  },
};

/** Keycaps for a shortcut, e.g. ["Ctrl", "Z"]. */
export function EditorShortcut({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key) => (
        <kbd key={key} className="plms-kbd">{key}</kbd>
      ))}
    </span>
  );
}

/**
 * A small tooltip that shows on hover and on keyboard focus. The label is also given to the control
 * as aria-label by the callers, so the tooltip itself is hidden from assistive technology.
 */
export function EditorTooltip({
  label,
  shortcut,
  side = "bottom",
  align = "center",
  children,
}: {
  label: string;
  shortcut?: string[];
  side?: TooltipSide;
  align?: TooltipAlign;
  children: ReactNode;
}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute z-40 hidden items-center gap-2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink shadow-pop group-hover/tip:flex group-has-[:focus-visible]/tip:flex ${sideClasses[side][align]}`}
      >
        {label}
        {shortcut && shortcut.length > 0 ? <EditorShortcut keys={shortcut} /> : null}
      </span>
    </span>
  );
}

type Tone = "default" | "danger";

/** 32px icon-only command with a tooltip. */
export function EditorCommandButton({
  icon: IconComponent,
  label,
  shortcut,
  onClick,
  disabled = false,
  tone = "default",
  active = false,
  side = "bottom",
  align = "center",
}: {
  icon: Icon;
  label: string;
  shortcut?: string[];
  onClick: () => void;
  disabled?: boolean;
  tone?: Tone;
  active?: boolean;
  side?: TooltipSide;
  align?: TooltipAlign;
}) {
  const toneClass = active
    ? "bg-raised text-ink"
    : tone === "danger"
      ? "text-ink-2 hover:bg-bad-soft hover:text-bad"
      : "text-ink-2 hover:bg-raised hover:text-ink";

  return (
    <EditorTooltip label={label} shortcut={shortcut} side={side} align={align}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active || undefined}
        aria-keyshortcuts={shortcut ? shortcut.join("+") : undefined}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ink-3 disabled:opacity-50 ${toneClass}`}
      >
        <IconComponent size={16} />
      </button>
    </EditorTooltip>
  );
}

/** 36px tool in the left rail; the selected tool gets the accent. */
export function EditorToolButton({
  icon: IconComponent,
  label,
  shortcut,
  active = false,
  onClick,
}: {
  icon: Icon;
  label: string;
  shortcut?: string[];
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <EditorTooltip label={label} shortcut={shortcut} side="right">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-raised hover:text-ink"}`}
      >
        <IconComponent size={18} weight={active ? "fill" : "regular"} />
      </button>
    </EditorTooltip>
  );
}
