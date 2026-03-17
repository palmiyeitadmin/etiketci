"use client";

import type { ReactNode } from "react";

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
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
            <div className="absolute inset-y-0 right-0 w-full max-w-xl border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] shadow-[0_20px_80px_rgba(15,23,42,0.5)]">
                <div className="flex items-start justify-between border-b border-[color:var(--plms-border)] px-6 py-6">
                    <div>
                        <h2 className="text-xl font-black tracking-[-0.04em] text-white">{title}</h2>
                        {subtitle ? <p className="mt-1 text-sm text-[color:var(--plms-text-subtle)]">{subtitle}</p> : null}
                    </div>
                    <button className="rounded-2xl border border-[color:var(--plms-border)] px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]" onClick={onClose}>
                        Close
                    </button>
                </div>
                <div className="h-[calc(100%-97px)] overflow-y-auto px-6 py-6">{children}</div>
            </div>
        </div>
    );
}
