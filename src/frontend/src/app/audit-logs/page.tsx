"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { AuditLogDto, AuditLogListResponse } from "@/types/audit";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";

export default function AuditLogsPage() {
    const { formatDateTime, locale } = useI18n();
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
    const text = locale === "tr"
        ? {
            eyebrow: "Denetim ve izlenebilirlik",
            title: "Denetim Kayıtları",
            description: "Sistemde yapılan işlemlerin değiştirilemez kaydı.",
            actionContains: "Aksiyon içerir...",
            allTypes: "Tüm varlık tipleri",
            apply: "Filtreleri Uygula",
            emptyTitle: "Denetim kaydı bulunamadı",
            emptyDescription: "Filtreleri değiştirin veya tarih aralığını genişletin.",
            timestamp: "Zaman Damgası",
            action: "Aksiyon",
            entity: "Varlık",
            actor: "İşlemi Yapan",
            correlation: "Korelasyon",
            inspect: "İncele",
            open: "Aç",
            system: "Sistem",
            total: "{count} toplam kayıt",
            previous: "Önceki",
            next: "Sonraki",
            page: "Sayfa {page} / {total}",
            detail: "Denetim detayı",
            trace: "Değiştirilemez operasyon izi",
            entityType: "Varlık Tipi",
            entityId: "Varlık Kimliği",
            details: "Detaylar",
            metadata: "Metadata",
        }
        : {
            eyebrow: "Audit and traceability",
            title: "Audit Logs",
            description: "Append-only system activity with correlation IDs, entity traces and operational event history.",
            actionContains: "Action contains...",
            allTypes: "All entity types",
            apply: "Apply Filters",
            emptyTitle: "No audit records found",
            emptyDescription: "Adjust the filters or broaden the selected date range.",
            timestamp: "Timestamp",
            action: "Action",
            entity: "Entity",
            actor: "Actor",
            correlation: "Correlation",
            inspect: "Inspect",
            open: "Open",
            system: "System",
            total: "{count} total records",
            previous: "Previous",
            next: "Next",
            page: "Page {page} / {total}",
            detail: "Audit detail",
            trace: "Immutable operational trace",
            entityType: "Entity Type",
            entityId: "Entity Id",
            details: "Details",
            metadata: "Metadata",
        };

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
                    eyebrow={text.eyebrow}
                    title={text.title}
                    description={text.description}
                />

                <FilterBar
                    left={
                        <>
                            <input className="plms-input max-w-sm" placeholder={text.actionContains} value={filters.action} onChange={(e) => setFilters((current) => ({ ...current, action: e.target.value }))} />
                            <select className="plms-select" value={filters.entityType} onChange={(e) => setFilters((current) => ({ ...current, entityType: e.target.value }))}>
                                <option value="">{text.allTypes}</option>
                                {entityTypes.map((entityType) => (
                                    <option key={entityType} value={entityType}>{entityType}</option>
                                ))}
                            </select>
                            <input className="plms-input" type="date" value={filters.from} onChange={(e) => setFilters((current) => ({ ...current, from: e.target.value }))} />
                            <input className="plms-input" type="date" value={filters.to} onChange={(e) => setFilters((current) => ({ ...current, to: e.target.value }))} />
                        </>
                    }
                    right={<button className="plms-button-primary" onClick={() => load(1)}>{text.apply}</button>}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>
                ) : logs.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <>
                        <DataTable columns={[text.timestamp, text.action, text.entity, text.actor, text.correlation, text.inspect]}>
                            {logs.map((log) => (
                                <tr key={log.id} className="transition-colors hover:bg-white/5">
                                    <td className="px-6 py-4 text-sm font-medium text-ink-2">{formatDateTime(log.timestamp)}</td>
                                    <td className="px-6 py-4"><StatusBadge label={log.action} tone="info" /></td>
                                    <td className="px-6 py-4 text-sm font-medium text-ink">{log.entityType}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-ink-2">{log.userId || text.system}</td>
                                    <td className="px-6 py-4 text-xs font-mono text-ink-3">{log.correlationId || "-"}</td>
                                    <td className="px-6 py-4">
                                        <button className="text-xs font-medium text-accent" onClick={() => setSelected(log)}>
                                            {text.open}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </DataTable>

                        <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-4">
                            <div className="text-xs font-medium text-ink-3">
                                {text.total.replace("{count}", String(meta.totalCount))}
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="plms-button-secondary" onClick={() => load(Math.max(1, meta.page - 1))} disabled={meta.page === 1}>
                                    {text.previous}
                                </button>
                                <div className="text-xs font-medium text-ink">
                                    {text.page.replace("{page}", String(meta.page)).replace("{total}", String(meta.totalPages))}
                                </div>
                                <button className="plms-button-secondary" onClick={() => load(Math.min(meta.totalPages, meta.page + 1))} disabled={meta.page >= meta.totalPages}>
                                    {text.next}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <SlideOver
                    open={Boolean(selected)}
                    title={selected?.action ?? text.detail}
                    subtitle={text.trace}
                    onClose={() => setSelected(null)}
                >
                    {selected ? (
                        <div className="space-y-5 text-sm">
                            <div>
                                <div className="text-xs font-medium text-ink-3">{text.timestamp}</div>
                                <div className="mt-2 font-medium text-ink">{formatDateTime(selected.timestamp)}</div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <div className="text-xs font-medium text-ink-3">{text.entityType}</div>
                                    <div className="mt-2 font-medium text-ink">{selected.entityType}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-ink-3">{text.entityId}</div>
                                    <div className="mt-2 break-all font-mono text-ink">{selected.entityId}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-ink-3">{text.actor}</div>
                                    <div className="mt-2 font-medium text-ink">{selected.userId || text.system}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-ink-3">{text.correlation}</div>
                                    <div className="mt-2 break-all font-mono text-ink">{selected.correlationId || "-"}</div>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-ink-3">{text.details}</div>
                                <div className="mt-2 rounded-lg border border-line bg-raised p-4 font-medium text-ink-2">
                                    {selected.details}
                                </div>
                            </div>
                            {selected.metadata ? (
                                <div>
                                    <div className="text-xs font-medium text-ink-3">{text.metadata}</div>
                                    <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-raised p-4 text-xs text-ink-2">
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
