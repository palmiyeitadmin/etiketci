"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { getPrintIntentStatusTone, normalizePrintIntentStatus } from "@/lib/print-intent-status";
import { PrintIntentDto, PrintIntentStatus } from "@/types/operational";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

type StatusFilter = "all" | "Pending" | "ReadyForPrint" | "SentToClient" | "done";

const doneStatuses: PrintIntentStatus[] = ["UserPrinted", "Failed", "Cancelled"];

function matchesFilter(status: PrintIntentStatus, filter: StatusFilter) {
    if (filter === "all") return true;
    if (filter === "done") return doneStatuses.includes(status);
    return status === filter;
}

export default function PrintIntentsPage() {
    const { formatDateTime, locale } = useI18n();
    const [intents, setIntents] = useState<PrintIntentDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const text = locale === "tr"
        ? {
            title: "Baskı talepleri",
            description: "Açılan baskı talepleri, PDF'in açılması ve baskı sonucu",
            createIntent: "Baskı talebi oluştur",
            searchPlaceholder: "Ürün, şablon veya kişi ara",
            loading: "Yükleniyor",
            emptyTitle: "Baskı talebi yok",
            emptyDescription: "Yeni bir baskı talebi oluşturun.",
            noMatchTitle: "Eşleşen talep yok",
            noMatchDescription: "Aramayı veya durum filtresini değiştirin.",
            filters: { all: "Tümü", Pending: "Bekliyor", ReadyForPrint: "Baskıya hazır", SentToClient: "PDF açıldı", done: "Tamamlanan" },
            statusFilter: "Durum filtresi",
            columns: ["Ürün", "Şablon", "Adet", "Durum", "Talep eden", "Oluşturulma"],
            status: {
                Pending: "Bekliyor",
                ReadyForPrint: "Baskıya hazır",
                SentToClient: "PDF açıldı",
                UserPrinted: "Basıldı",
                Failed: "Hatalı",
                Cancelled: "İptal edildi",
            } as Record<PrintIntentStatus, string>,
        }
        : {
            title: "Print requests",
            description: "Open print requests, PDF opening and print outcome",
            createIntent: "Create print request",
            searchPlaceholder: "Search product, template or person",
            loading: "Loading",
            emptyTitle: "No print requests",
            emptyDescription: "Create a new print request.",
            noMatchTitle: "No matching requests",
            noMatchDescription: "Change the search or the status filter.",
            filters: { all: "All", Pending: "Pending", ReadyForPrint: "Ready to print", SentToClient: "PDF opened", done: "Completed" },
            statusFilter: "Status filter",
            columns: ["Product", "Template", "Quantity", "Status", "Requested by", "Created"],
            status: {
                Pending: "Pending",
                ReadyForPrint: "Ready to print",
                SentToClient: "PDF opened",
                UserPrinted: "Printed",
                Failed: "Failed",
                Cancelled: "Cancelled",
            } as Record<PrintIntentStatus, string>,
        };

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
                matchesFilter(intent.status, statusFilter) &&
                [intent.productName, intent.templateName, intent.requestedBy, intent.status, text.status[intent.status]]
                    .join(" ")
                    .toLowerCase()
                    .includes(query.toLowerCase())
            ),
        [intents, query, statusFilter, text.status]
    );

    const filterKeys: StatusFilter[] = ["all", "Pending", "ReadyForPrint", "SentToClient", "done"];

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="flex flex-col gap-6 pb-10">
                <PageHeader
                    title={text.title}
                    description={text.description}
                    actions={
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <Link href="/print-intents/new" className="plms-button-primary">
                                <Plus size={16} />
                                {text.createIntent}
                            </Link>
                        </RoleGuard>
                    }
                />

                <FilterBar
                    left={
                        <input
                            className="plms-input max-w-sm"
                            placeholder={text.searchPlaceholder}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    }
                    right={
                        <div role="group" aria-label={text.statusFilter} className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
                            {filterKeys.map((key) => {
                                const count = intents.filter((intent) => matchesFilter(intent.status, key)).length;
                                const active = statusFilter === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setStatusFilter(key)}
                                        className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm transition-colors ${
                                            active ? "bg-raised font-medium text-ink" : "text-ink-2 hover:bg-raised hover:text-ink"
                                        }`}
                                    >
                                        {text.filters[key]}
                                        <span className="tabular font-mono text-xs text-ink-3">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    }
                />

                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-sm text-ink-2">
                        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                        {text.loading}
                    </div>
                ) : filtered.length === 0 ? (
                    intents.length === 0 ? (
                        <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                    ) : (
                        <EmptyState title={text.noMatchTitle} description={text.noMatchDescription} />
                    )
                ) : (
                    <DataTable columns={text.columns}>
                        {filtered.map((intent) => (
                            <tr key={intent.id} className="transition-colors hover:bg-raised">
                                <td className="px-4 py-2.5 text-base">
                                    <Link href={`/print-intents/${intent.id}`} className="font-medium text-ink transition-colors hover:text-accent">
                                        {intent.productName}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5 text-base text-ink-2">
                                    <span className="whitespace-nowrap">{intent.templateName}</span>
                                    <span className="ml-2 whitespace-nowrap font-mono text-xs text-ink-3">v{intent.versionNumber}</span>
                                </td>
                                <td className="tabular px-4 py-2.5 font-mono text-sm text-ink">{intent.quantity}</td>
                                <td className="px-4 py-2.5">
                                    <StatusBadge label={text.status[intent.status]} tone={intent.status === "Cancelled" ? "neutral" : getPrintIntentStatusTone(intent.status)} />
                                </td>
                                <td className="px-4 py-2.5 text-base text-ink-2">{intent.requestedBy}</td>
                                <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-3">
                                    {formatDateTime(intent.createdAt)}
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}
            </div>
        </RoleGuard>
    );
}
