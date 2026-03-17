"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { getPrintIntentStatusLabel, getPrintIntentStatusTone, normalizePrintIntentStatus } from "@/lib/print-intent-status";
import { PrintIntentDto } from "@/types/operational";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function PrintIntentsPage() {
    const { formatDateTime, t } = useI18n();
    const [intents, setIntents] = useState<PrintIntentDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");

    useEffect(() => {
        async function load() {
            const res = await apiFetch<PrintIntentDto[]>("/api/PrintIntents");
            if (res.success) {
                setIntents(res.data.map((intent) => ({ ...intent, status: normalizePrintIntentStatus(intent.status) })));
            }
            setLoading(false);
        }

        load();
    }, []);

    const filtered = useMemo(
        () =>
            intents.filter((intent) =>
                [intent.productName, intent.templateName, intent.requestedBy, intent.status]
                    .join(" ")
                    .toLowerCase()
                    .includes(query.toLowerCase())
            ),
        [intents, query]
    );

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow={t("printIntents.eyebrow")}
                    title={t("printIntents.title")}
                    description={t("printIntents.description")}
                    actions={
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <Link href="/print-intents/new" className="plms-button-primary">
                                {t("printIntents.createIntent")}
                            </Link>
                        </RoleGuard>
                    }
                />

                <div className="grid gap-5 md:grid-cols-3">
                    <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("printIntents.pendingReview")}</div>
                        <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">
                            {intents.filter((intent) => intent.status === "Pending").length}
                        </div>
                    </div>
                    <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("printIntents.awaitingDispatch")}</div>
                        <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">
                            {intents.filter((intent) => intent.status === "ReadyForPrint").length}
                        </div>
                    </div>
                    <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("printIntents.awaitingConfirmation")}</div>
                        <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">
                            {intents.filter((intent) => intent.status === "SentToClient").length}
                        </div>
                    </div>
                    <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("printIntents.completed")}</div>
                        <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">
                            {intents.filter((intent) => intent.status === "UserPrinted" || intent.status === "Failed" || intent.status === "Cancelled").length}
                        </div>
                    </div>
                </div>

                <FilterBar
                    left={
                        <input
                            className="plms-input max-w-xl"
                            placeholder={t("printIntents.searchPlaceholder")}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    }
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title={t("printIntents.emptyTitle")}
                        description={t("printIntents.emptyDescription")}
                    />
                ) : (
                    <DataTable columns={[t("printIntents.table.product"), t("printIntents.table.template"), t("printIntents.table.version"), t("printIntents.table.quantity"), t("printIntents.table.status"), t("printIntents.table.requestedBy"), t("printIntents.table.created"), t("printIntents.table.open")]}>
                        {filtered.map((intent) => (
                            <tr key={intent.id} className="transition-colors hover:bg-white/5">
                                <td className="px-6 py-4 text-sm font-bold text-white">{intent.productName}</td>
                                <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{intent.templateName}</td>
                                <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">v{intent.versionNumber}</td>
                                <td className="px-6 py-4 text-sm font-bold text-white">{intent.quantity}</td>
                                <td className="px-6 py-4"><StatusBadge label={getPrintIntentStatusLabel(intent.status)} tone={getPrintIntentStatusTone(intent.status)} /></td>
                                <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{intent.requestedBy}</td>
                                <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                                    {formatDateTime(intent.createdAt)}
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/print-intents/${intent.id}`} className="text-xs font-black uppercase tracking-[0.22em] text-blue-300 hover:text-blue-200">
                                        {t("common.open")}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}
            </div>
        </RoleGuard>
    );
}
