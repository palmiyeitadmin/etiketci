"use client";

import { ReactNode } from "react";

export function MetricCard({
    label,
    value,
    hint,
    accent = "primary",
    icon,
}: {
    label: string;
    value: string | number;
    hint?: string;
    accent?: "primary" | "success" | "warning" | "neutral";
    icon?: ReactNode;
}) {
    const accentClasses = {
        primary: "border-blue-500/20 bg-blue-500/8",
        success: "border-emerald-500/20 bg-emerald-500/8",
        warning: "border-amber-500/20 bg-amber-500/8",
        neutral: "border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)]",
    };

    return (
        <div className={`rounded-3xl border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ${accentClasses[accent]}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{label}</p>
                    <div className="text-3xl font-black tracking-[-0.05em] text-white">{value}</div>
                    {hint ? <p className="text-xs font-medium text-[color:var(--plms-text-subtle)]">{hint}</p> : null}
                </div>
                {icon ? <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/80">{icon}</div> : null}
            </div>
        </div>
    );
}
