"use client";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
    neutral: "bg-[color:var(--plms-muted-100)] text-[color:var(--plms-text-muted)] border-[color:var(--plms-border-strong)]",
    info: "bg-blue-500/10 text-blue-300 border-blue-400/20",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-400/20",
    warning: "bg-amber-500/10 text-amber-300 border-amber-400/20",
    danger: "bg-red-500/10 text-red-300 border-red-400/20",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${toneClasses[tone]}`}>
            {label}
        </span>
    );
}
