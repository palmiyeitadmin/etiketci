"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, Plus, Printer } from "@phosphor-icons/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n, useText } from "@/lib/i18n";
import { getPrintIntentStatusTone, normalizePrintIntentStatus } from "@/lib/print-intent-status";
import { AWAITING_OUTCOME_WARNING_MINUTES, minutesSince } from "@/lib/print-station";
import { PrintIntentDto, PrintIntentPage, PrintIntentStatus } from "@/types/operational";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

type StatusFilter = "all" | "Pending" | "ReadyForPrint" | "SentToClient" | "done";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 250;
const doneStatuses: PrintIntentStatus[] = ["UserPrinted", "Failed", "Cancelled"];
const filterKeys: StatusFilter[] = ["all", "Pending", "ReadyForPrint", "SentToClient", "done"];

/** The status query parameter for a filter chip; undefined means no status filter. */
function statusParam(filter: StatusFilter): string | undefined {
    if (filter === "all") return undefined;
    if (filter === "done") return doneStatuses.join(",");
    return filter;
}

function countFor(counts: PrintIntentPage["counts"] | undefined, filter: StatusFilter): number {
    if (!counts) return 0;
    const values = counts as Record<string, number | undefined>;
    if (filter === "all") return Object.values(values).reduce<number>((sum, value) => sum + (value ?? 0), 0);
    if (filter === "done") return doneStatuses.reduce((sum, status) => sum + (values[status] ?? 0), 0);
    return values[filter] ?? 0;
}

export default function PrintIntentsPage() {
    const { formatDateTime } = useI18n();
    const [result, setResult] = useState<PrintIntentPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [page, setPage] = useState(1);
    const [now, setNow] = useState(() => Date.now());

    const { list: text, statuses: statusLabels } = useText("printRequests");

    // Search is sent to the server after typing pauses; a new search starts from the first page.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearch(query.trim());
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [query]);

    // Waiting times are relative to now; refresh them every minute.
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        const status = statusParam(statusFilter);
        if (status) params.set("status", status);
        if (search) params.set("search", search);

        setLoading(true);
        apiFetch<PrintIntentPage>(`/api/PrintIntents?${params.toString()}`).then((res) => {
            if (cancelled) return;
            if (res.success) {
                setResult({
                    ...res.data,
                    items: res.data.items.map((intent) => ({ ...intent, status: normalizePrintIntentStatus(intent.status) })),
                });
                setError(null);
                setNow(Date.now());
            } else {
                setError(res.error.message);
            }
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [page, search, statusFilter]);

    const items: PrintIntentDto[] = result?.items ?? [];
    const total = result?.total ?? 0;
    const totalAll = countFor(result?.counts, "all");
    const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const lastRow = Math.min(page * PAGE_SIZE, total);
    const hasPrevious = page > 1;
    const hasNext = page * PAGE_SIZE < total;

    function selectFilter(key: StatusFilter) {
        setStatusFilter(key);
        setPage(1);
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="flex flex-col gap-6 pb-10">
                <PageHeader
                    title={text.title}
                    description={text.description}
                    actions={
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <Link href="/print" className="plms-button-secondary">
                                <Printer size={16} />
                                {text.station}
                            </Link>
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
                                const active = statusFilter === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => selectFilter(key)}
                                        className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm transition-colors ${
                                            active ? "bg-raised font-medium text-ink" : "text-ink-2 hover:bg-raised hover:text-ink"
                                        }`}
                                    >
                                        {text.filters[key]}
                                        <span className="tabular font-mono text-xs text-ink-3">{result ? countFor(result.counts, key) : ""}</span>
                                    </button>
                                );
                            })}
                        </div>
                    }
                />

                {error ? <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

                {loading && !result ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-sm text-ink-2">
                        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                        {text.loading}
                    </div>
                ) : !result ? null : items.length === 0 ? (
                    totalAll === 0 && !search ? (
                        <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                    ) : (
                        <EmptyState title={text.noMatchTitle} description={text.noMatchDescription} />
                    )
                ) : (
                    <div className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
                        <DataTable columns={[text.columns.product, text.columns.template, text.columns.quantity, text.columns.status, text.columns.requestedBy, text.columns.createdAt]}>
                            {items.map((intent) => {
                                const waited = intent.status === "SentToClient" ? minutesSince(intent.dispatchedAt, now) : 0;
                                const waitedTooLong = waited >= AWAITING_OUTCOME_WARNING_MINUTES;
                                return (
                                    <tr key={intent.id} className="transition-colors hover:bg-raised">
                                        <td className="px-4 py-2.5 text-base">
                                            <div className="flex items-center gap-2">
                                                <Link href={`/print-intents/${intent.id}`} className="font-medium text-ink transition-colors hover:text-accent">
                                                    {intent.productName}
                                                </Link>
                                                {intent.reprintOfId ? (
                                                    <span title={text.reprintMarkerTitle} className="inline-flex h-5 shrink-0 items-center rounded border border-line px-1.5 text-xs text-ink-2">
                                                        {text.reprintMarker}
                                                    </span>
                                                ) : null}
                                            </div>
                                            {intent.productSku ? <div className="font-mono text-xs text-ink-3">{intent.productSku}</div> : null}
                                        </td>
                                        <td className="px-4 py-2.5 text-base text-ink-2">
                                            <span className="whitespace-nowrap">{intent.templateName}</span>
                                            <span className="ml-2 whitespace-nowrap font-mono text-xs text-ink-3">v{intent.versionNumber}</span>
                                        </td>
                                        <td className="tabular px-4 py-2.5 font-mono text-sm text-ink">{intent.quantity}</td>
                                        <td className="px-4 py-2.5">
                                            <StatusBadge label={statusLabels[intent.status]} tone={intent.status === "Cancelled" ? "neutral" : getPrintIntentStatusTone(intent.status)} />
                                            {intent.status === "SentToClient" && intent.dispatchedAt ? (
                                                <div className={`tabular mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs ${waitedTooLong ? "text-warn" : "text-ink-3"}`}>
                                                    {waitedTooLong ? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" /> : null}
                                                    {text.openedAgo(waited)}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-2.5 text-base text-ink-2">{intent.requestedBy}</td>
                                        <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-3">
                                            {formatDateTime(intent.createdAt)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </DataTable>

                        <nav aria-label={text.pagination} className="flex items-center justify-end gap-2">
                            <span className="tabular px-2 font-mono text-sm text-ink-2">
                                {firstRow}–{lastRow} / {total}
                            </span>
                            <button type="button" className="plms-button-secondary" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={!hasPrevious || loading}>
                                <CaretLeft size={16} aria-hidden />
                                {text.previous}
                            </button>
                            <button type="button" className="plms-button-secondary" onClick={() => setPage((value) => value + 1)} disabled={!hasNext || loading}>
                                {text.next}
                                <CaretRight size={16} aria-hidden />
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
