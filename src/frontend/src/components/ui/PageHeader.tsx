"use client";

import type { ReactNode } from "react";

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
        <div className="flex flex-col gap-6 border-b border-[color:var(--plms-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
                {eyebrow ? (
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[color:var(--plms-text-subtle)]">
                        {eyebrow}
                    </div>
                ) : null}
                <div>
                    <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">{title}</h1>
                    {description ? (
                        <p className="mt-2 max-w-3xl text-sm font-medium text-[color:var(--plms-text-subtle)]">
                            {description}
                        </p>
                    ) : null}
                </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
    );
}
