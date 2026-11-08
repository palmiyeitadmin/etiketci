"use client";

import { useEffect } from "react";
import { useText } from "@/lib/i18n";
import { Portal } from "@/components/ui/Portal";

export function ConfirmModal({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
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
    const text = useText("common").confirm;

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !loading) onCancel();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, loading, onCancel]);

    if (!open) return null;

    return (
        <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onClick={() => !loading && onCancel()}>
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-modal-title"
                    className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-pop"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex flex-col gap-1.5">
                        <h2 id="confirm-modal-title" className="text-md font-medium text-ink">{title}</h2>
                        <p className="text-sm text-ink-2">{description}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" className="plms-button-secondary" onClick={onCancel} disabled={loading}>
                            {cancelLabel ?? text.cancel}
                        </button>
                        <button
                            type="button"
                            className={tone === "danger" ? "plms-button-primary !bg-bad hover:!bg-bad/90" : "plms-button-primary"}
                            onClick={onConfirm}
                            disabled={loading}
                            autoFocus
                        >
                            {loading ? text.working : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
