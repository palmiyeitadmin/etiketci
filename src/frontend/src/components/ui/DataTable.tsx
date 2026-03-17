"use client";

import type { ReactNode } from "react";

export function DataTable({
    columns,
    children,
    empty,
}: {
    columns: string[];
    children?: ReactNode;
    empty?: ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] shadow-[0_20px_70px_rgba(15,23,42,0.24)]">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[color:var(--plms-border)]">
                    <thead className="bg-[color:var(--plms-panel-2)]/80">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column}
                                    className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]"
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--plms-border)]">
                        {children}
                    </tbody>
                </table>
            </div>
            {empty ? <div className="border-t border-[color:var(--plms-border)]">{empty}</div> : null}
        </div>
    );
}
