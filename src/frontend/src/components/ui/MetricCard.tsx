"use client";

import { ReactNode } from "react";

/**
 * A number with its label and what it compares to. Tone only colors the hint, never the card,
 * so a row of stats stays quiet and the one that needs attention stands out.
 */
export function MetricCard({
    label,
    value,
    hint,
    accent = "neutral",
    href,
}: {
    label: string;
    value: string | number;
    hint?: string;
    accent?: "primary" | "success" | "warning" | "danger" | "neutral";
    icon?: ReactNode;
    href?: string;
}) {
    const hintTone = {
        primary: "text-accent",
        success: "text-good",
        warning: "text-warn",
        danger: "text-bad",
        neutral: "text-ink-3",
    }[accent];

    const body = (
        <>
            <p className="text-sm text-ink-2">{label}</p>
            <div className="tabular text-xl font-medium text-ink">{value}</div>
            {hint ? <p className={`text-sm ${hintTone}`}>{hint}</p> : null}
        </>
    );

    const className = "flex flex-col gap-1 rounded-xl border border-line bg-surface px-5 py-4";
    return href ? (
        <a href={href} className={`${className} transition-colors hover:border-line-strong`}>{body}</a>
    ) : (
        <div className={className}>{body}</div>
    );
}
