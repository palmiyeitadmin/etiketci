"use client";

import { useEffect, useMemo, useState } from "react";
import { auditActionLabel, auditEntityLabel } from "@/lib/dashboard-feed";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n, useText } from "@/lib/i18n";
import { auditSummary } from "@/lib/backend-text";
import { AuditLogDto, AuditLogListResponse } from "@/types/audit";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { SlideOver } from "@/components/ui/SlideOver";

// Audit codes come from the backend in English PascalCase; the Turkish UI names them in plain words.
export default function AuditLogsPage() {
    const { formatDateTime, locale } = useI18n();
    const actionLabel = (code: string) => auditActionLabel(locale, code);
    const entityLabel = (code: string) => auditEntityLabel(locale, code);
    const [logs, setLogs] = useState<AuditLogDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<AuditLogDto | null>(null);
    const [filters, setFilters] = useState({
        action: "",
        entityType: "",
        from: "",
        to: "",
    });
    const [meta, setMeta] = useState({ page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });
    const text = useText("admin").auditLogs;
    const auditText = useText("audit");

    async function load(page = 1) {
        setLoading(true);

        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(meta.pageSize),
        });

        if (filters.action) params.set("action", filters.action);
        if (filters.entityType) params.set("entityType", filters.entityType);
        if (filters.from) params.set("from", new Date(filters.from).toISOString());
        if (filters.to) params.set("to", new Date(filters.to).toISOString());

        const res = await apiFetch<AuditLogListResponse>(`/api/audit-logs?${params.toString()}`);
        if (res.success) {
            setLogs(res.data.items);
            setMeta({
                page: res.data.page,
                pageSize: res.data.pageSize,
                totalCount: res.data.totalCount,
                totalPages: res.data.totalPages,
            });
        }

        setLoading(false);
    }

    useEffect(() => {
        load(1);
    }, []);

    const entityTypes = useMemo(() => Array.from(new Set(logs.map((log) => log.entityType))).sort(), [logs]);

    const setFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="space-y-6">
                <PageHeader title={text.title} description={text.description} />

                <form onSubmit={(event) => { event.preventDefault(); load(1); }}>
                    <FilterBar
                        left={
                            <>
                                <input className="plms-input w-56" placeholder={text.actionContains} value={filters.action} onChange={(e) => setFilter("action", e.target.value)} />
                                <select className="plms-select" aria-label={text.entity} value={filters.entityType} onChange={(e) => setFilter("entityType", e.target.value)}>
                                    <option value="">{text.allTypes}</option>
                                    {entityTypes.map((entityType) => (
                                        <option key={entityType} value={entityType}>{entityLabel(entityType)}</option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-2">
                                    <input className="plms-input w-40 font-mono" type="date" aria-label={text.from} value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
                                    <span aria-hidden className="text-ink-3">–</span>
                                    <input className="plms-input w-40 font-mono" type="date" aria-label={text.to} value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
                                </div>
                                <button type="submit" className="plms-button-secondary">{text.apply}</button>
                            </>
                        }
                        right={!loading ? <span className="tabular text-sm text-ink-3">{text.total(meta.totalCount)}</span> : null}
                    />
                </form>

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
                ) : logs.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <>
                        <DataTable columns={[text.timestamp, text.action, text.entity, text.actor, text.correlation, ""]}>
                            {logs.map((log) => (
                                <tr key={log.id} className="transition-colors hover:bg-raised">
                                    <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-3">{formatDateTime(log.timestamp)}</td>
                                    <td className="max-w-md px-4 py-2.5">
                                        <span className="block text-base text-ink">{actionLabel(log.action)}</span>
                                        {auditSummary(locale, log.action, log.metadata) ? (
                                            <span className="block truncate text-sm text-ink-3">{auditSummary(locale, log.action, log.metadata)}</span>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-2.5 text-base text-ink-2">{entityLabel(log.entityType)}</td>
                                    <td className="max-w-48 truncate px-4 py-2.5 text-base text-ink-2" title={log.userId || undefined}>{!log.userId || log.userId === "System" ? text.system : log.userId}</td>
                                    <td className="px-4 py-2.5">
                                        {log.correlationId ? (
                                            <span className="block w-28 truncate whitespace-nowrap font-mono text-xs text-ink-3" title={log.correlationId}>{log.correlationId}</span>
                                        ) : (
                                            <span className="text-ink-3">–</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-1.5 text-right">
                                        <button className="plms-button-compact" onClick={() => setSelected(log)}>
                                            {text.open}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </DataTable>

                        <div className="flex items-center justify-end gap-2">
                            <button className="plms-button-secondary" onClick={() => load(Math.max(1, meta.page - 1))} disabled={meta.page === 1}>
                                <CaretLeft size={16} aria-hidden />
                                {text.previous}
                            </button>
                            <span className="tabular px-2 font-mono text-sm text-ink-2">
                                {text.page(meta.page, meta.totalPages)}
                            </span>
                            <button className="plms-button-secondary" onClick={() => load(Math.min(meta.totalPages, meta.page + 1))} disabled={meta.page >= meta.totalPages}>
                                {text.next}
                                <CaretRight size={16} aria-hidden />
                            </button>
                        </div>
                    </>
                )}

                <SlideOver
                    open={Boolean(selected)}
                    title={selected ? actionLabel(selected.action) : text.detail}
                    subtitle={selected ? formatDateTime(selected.timestamp) : undefined}
                    onClose={() => setSelected(null)}
                >
                    {selected ? (
                        <div className="space-y-5 text-sm">
                            <dl className="grid gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-1">
                                    <dt className="text-sm text-ink-3">{text.entityType}</dt>
                                    <dd className="text-ink">{entityLabel(selected.entityType)}</dd>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <dt className="text-sm text-ink-3">{text.actor}</dt>
                                    <dd className="break-all text-ink">{!selected.userId || selected.userId === "System" ? text.system : selected.userId}</dd>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <dt className="text-sm text-ink-3">{text.entityId}</dt>
                                    <dd className="break-all font-mono text-xs text-ink">{selected.entityId}</dd>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <dt className="text-sm text-ink-3">{text.correlation}</dt>
                                    <dd className="break-all font-mono text-xs text-ink">{selected.correlationId || "–"}</dd>
                                </div>
                            </dl>
                            {auditSummary(locale, selected.action, selected.metadata) ? (
                                <div className="flex flex-col gap-1.5">
                                    <div className="text-sm text-ink-3">{text.summary}</div>
                                    <div className="text-base text-ink">{auditSummary(locale, selected.action, selected.metadata)}</div>
                                </div>
                            ) : null}
                            <details className="group" open={!auditSummary(locale, selected.action, selected.metadata)}>
                                <summary className="cursor-pointer text-sm text-ink-3 hover:text-ink-2">{auditText.technicalDetails}</summary>
                                <div className="mt-2 flex flex-col gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="text-sm text-ink-3">{text.details}</div>
                                        <div className="rounded-lg border border-line bg-raised px-3 py-2.5 text-ink-2">
                                            {selected.details}
                                        </div>
                                    </div>
                                    {selected.metadata ? (
                                        <div className="flex flex-col gap-1.5">
                                            <div className="text-sm text-ink-3">{text.metadata}</div>
                                            <pre className="overflow-x-auto rounded-lg border border-line bg-raised px-3 py-2.5 font-mono text-xs text-ink-2">
                                                {selected.metadata}
                                            </pre>
                                        </div>
                                    ) : null}
                                </div>
                            </details>
                        </div>
                    ) : null}
                </SlideOver>
            </div>
        </RoleGuard>
    );
}
