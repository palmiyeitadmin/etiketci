"use client";

import type { ReactNode } from "react";

export function FilterBar({
    left,
    right,
}: {
    left: ReactNode;
    right?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3">{left}</div>
            {right ? <div className="flex flex-wrap items-center gap-3">{right}</div> : null}
        </div>
    );
}
