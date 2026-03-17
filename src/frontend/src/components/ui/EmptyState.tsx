"use client";

import { useI18n } from "@/lib/i18n";

export function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    const { t } = useI18n();

    return (
        <div className="rounded-3xl border border-dashed border-[color:var(--plms-border-strong)] bg-[color:var(--plms-panel-2)] px-8 py-16 text-center">
            <div className="mx-auto max-w-md space-y-3">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[color:var(--plms-text-subtle)]">{t("common.noRecords")}</div>
                <h3 className="text-xl font-black tracking-[-0.04em] text-white">{title}</h3>
                <p className="text-sm font-medium text-[color:var(--plms-text-subtle)]">{description}</p>
                {action ? <div className="pt-4">{action}</div> : null}
            </div>
        </div>
    );
}
