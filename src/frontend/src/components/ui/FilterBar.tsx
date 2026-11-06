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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">{left}</div>
            {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
        </div>
    );
}
