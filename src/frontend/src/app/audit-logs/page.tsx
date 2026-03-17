"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { AuditLogDto, AuditLogListResponse } from "@/types/audit";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";

export default function AuditLogsPage() {
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

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow="Audit and traceability"
                    title="Audit Logs"
                    description="Append-only system activity with correlation IDs, entity traces and operational event history."
                />

                <FilterBar
                    left={
                        <>
                            <input className="plms-input max-w-sm" placeholder="Action contains..." value={filters.action} onChange={(e) => setFilters((current) => ({ ...current, action: e.target.value }))} />
                            <select className="plms-select" value={filters.entityType} onChange={(e) => setFilters((current) => ({ ...current, entityType: e.target.value }))}>
                                <option value="">All entity types</option>
                                {entityTypes.map((entityType) => (
                                    <option key={entityType} value={entityType}>{entityType}</option>
                                ))}
                            </select>
                            <input className="plms-input" type="date" value={filters.from} onChange={(e) => setFilters((current) => ({ ...current, from: e.target.value }))} />
                            <input className="plms-input" type="date" value={filters.to} onChange={(e) => setFilters((current) => ({ ...current, to: e.target.value }))} />
                        </>
                    }
                    right={<button className="plms-button-primary" onClick={() => load(1)}>Apply Filters</button>}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : logs.length === 0 ? (
                    <EmptyState title="No audit records found" description="Adjust the filters or broaden the selected date range." />
                ) : (
                    <>
                        <DataTable columns={["Timestamp", "Action", "Entity", "Actor", "Correlation", "Inspect"]}>
                            {logs.map((log) => (
                                <tr key={log.id} className="transition-colors hover:bg-white/5">
                                    <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4"><StatusBadge label={log.action} tone="info" /></td>
                                    <td className="px-6 py-4 text-sm font-bold text-white">{log.entityType}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{log.userId || "System"}</td>
                                    <td className="px-6 py-4 text-xs font-mono text-[color:var(--plms-text-subtle)]">{log.correlationId || "-"}</td>
                                    <td className="px-6 py-4">
                                        <button className="text-xs font-black uppercase tracking-[0.22em] text-blue-300" onClick={() => setSelected(log)}>
                                            Open
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </DataTable>

                        <div className="flex items-center justify-between rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-5 py-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                                {meta.totalCount} total records
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="plms-button-secondary" onClick={() => load(Math.max(1, meta.page - 1))} disabled={meta.page === 1}>
                                    Previous
                                </button>
                                <div className="text-xs font-black uppercase tracking-[0.22em] text-white">
                                    Page {meta.page} / {meta.totalPages}
                                </div>
                                <button className="plms-button-secondary" onClick={() => load(Math.min(meta.totalPages, meta.page + 1))} disabled={meta.page >= meta.totalPages}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <SlideOver
                    open={Boolean(selected)}
                    title={selected?.action ?? "Audit detail"}
                    subtitle="Immutable operational trace"
                    onClose={() => setSelected(null)}
                >
                    {selected ? (
                        <div className="space-y-5 text-sm">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Timestamp</div>
                                <div className="mt-2 font-medium text-white">{new Date(selected.timestamp).toLocaleString()}</div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Entity Type</div>
                                    <div className="mt-2 font-medium text-white">{selected.entityType}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Entity Id</div>
                                    <div className="mt-2 break-all font-mono text-white">{selected.entityId}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Actor</div>
                                    <div className="mt-2 font-medium text-white">{selected.userId || "System"}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Correlation Id</div>
                                    <div className="mt-2 break-all font-mono text-white">{selected.correlationId || "-"}</div>
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Details</div>
                                <div className="mt-2 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 font-medium text-[color:var(--plms-text-muted)]">
                                    {selected.details}
                                </div>
                            </div>
                            {selected.metadata ? (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Metadata</div>
                                    <pre className="mt-2 overflow-x-auto rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-xs text-[color:var(--plms-text-muted)]">
                                        {selected.metadata}
                                    </pre>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </SlideOver>
            </div>
        </RoleGuard>
    );
}
