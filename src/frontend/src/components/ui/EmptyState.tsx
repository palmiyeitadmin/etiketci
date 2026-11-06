"use client";

export function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
            <h3 className="text-md font-medium text-ink">{title}</h3>
            <p className="max-w-md text-sm text-ink-2">{description}</p>
            {action ? <div className="pt-2">{action}</div> : null}
        </div>
    );
}
