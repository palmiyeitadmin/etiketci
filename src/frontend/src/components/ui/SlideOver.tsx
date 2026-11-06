"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import { Portal } from "@/components/ui/Portal";

export function SlideOver({
    open,
    title,
    subtitle,
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const { t } = useI18n();

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <Portal>
            <div className="fixed inset-0 z-50 bg-ink/30" onClick={onClose}>
                <aside
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-line bg-surface shadow-pop"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                        <div className="min-w-0">
                            <h2 className="text-md font-medium text-ink">{title}</h2>
                            {subtitle ? <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p> : null}
                        </div>
                        <button type="button" className="plms-button-ghost h-8 w-8 px-0" onClick={onClose} aria-label={t("common.close")} title={t("common.close")}>
                            <X size={16} />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
                </aside>
            </div>
        </Portal>
    );
}
