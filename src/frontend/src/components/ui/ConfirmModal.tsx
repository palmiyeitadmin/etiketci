"use client";

import { useI18n } from "@/lib/i18n";

export function ConfirmModal({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel = "Cancel",
    tone = "danger",
    onConfirm,
    onCancel,
    loading = false,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: "danger" | "primary";
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}) {
    const { locale } = useI18n();
    const text = locale === "tr"
        ? { title: "Onay", working: "Calisiyor..." }
        : { title: "Confirmation", working: "Working..." };

    if (!open) return null;

    const confirmClasses = tone === "danger"
        ? "bg-red-600 hover:bg-red-700 text-white"
        : "bg-blue-600 hover:bg-blue-700 text-white";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.55)]">
                <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[color:var(--plms-text-subtle)]">{text.title}</div>
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-white">{title}</h2>
                    <p className="text-sm font-medium text-[color:var(--plms-text-subtle)]">{description}</p>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button className="rounded-2xl border border-[color:var(--plms-border)] px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button
                        className={`rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.22em] ${confirmClasses} disabled:opacity-50`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? text.working : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
