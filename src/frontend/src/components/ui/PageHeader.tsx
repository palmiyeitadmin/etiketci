"use client";

import type { ReactNode } from "react";

/**
 * Page title row. The eyebrow prop is kept for compatibility but only shown as a quiet breadcrumb,
 * so pages do not repeat the same idea three times (eyebrow, title, description).
 */
export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
                {eyebrow ? <div className="text-sm text-ink-3">{eyebrow}</div> : null}
                <h1 className="text-xl font-medium text-ink">{title}</h1>
                {description ? <p className="max-w-2xl text-sm text-ink-2">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    );
}
