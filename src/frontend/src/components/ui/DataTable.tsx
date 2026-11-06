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
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line text-sm">
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th key={column} scope="col" className="h-10 whitespace-nowrap px-4 text-left text-sm font-medium text-ink-3">
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">{children}</tbody>
                </table>
            </div>
            {empty ? <div className="border-t border-line p-4">{empty}</div> : null}
        </div>
    );
}
