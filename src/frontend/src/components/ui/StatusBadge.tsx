"use client";

import { useI18n } from "@/lib/i18n";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const dotClasses: Record<StatusTone, string> = {
    neutral: "bg-ink-3",
    info: "bg-accent",
    success: "bg-good",
    warning: "bg-warn",
    danger: "bg-bad",
};

/** Status as quiet text with a colored dot; the dot carries the meaning, not a filled pill. */
export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
    const { translateLabel } = useI18n();

    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-2">
            <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClasses[tone]}`} />
            {translateLabel(label)}
        </span>
    );
}
