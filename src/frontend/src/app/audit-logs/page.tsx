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
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { SlideOver } from "@/components/ui/SlideOver";

// Audit codes come from the backend in English PascalCase; the Turkish UI names them in plain words.
const actionLabelsTr: Record<string, string> = {
    CategoryCreated: "Kategori oluşturuldu",
    CategoryDeleted: "Kategori silindi",
    CategoryUpdated: "Kategori güncellendi",
    ImportSessionCommitted: "CSV içe aktarımı kaydedildi",
    ImportSessionCreated: "CSV dosyası kontrol edildi",
    PrintIntentCancelled: "Baskı talebi iptal edildi",
    PrintIntentCreated: "Baskı talebi oluşturuldu",
    PrintIntentFailed: "Baskı başarısız",
    PrintIntentHandoffConfirmed: "Baskıya gönderim onaylandı",
    PrintIntentHandoffFailed: "Baskıya gönderim başarısız",
    PrintIntentPdfDispatched: "Baskı PDF'i açıldı",
    PrintIntentUserPrinted: "Baskı tamamlandı",
    ProductCreated: "Ürün oluşturuldu",
    ProductTemplateLinked: "Şablon ürüne bağlandı",
    ProductTemplateUnlinked: "Şablon bağlantısı kaldırıldı",
    ProductUpdated: "Ürün güncellendi",
    TemplateApprovalRequested: "Şablon onaya gönderildi",
    TemplateArchived: "Şablon arşivlendi",
    TemplateCategoryCreated: "Şablon kategorisi oluşturuldu",
    TemplateCategoryDeleted: "Şablon kategorisi silindi",
    TemplateCategoryUpdated: "Şablon kategorisi güncellendi",
    TemplateCloned: "Şablon kopyalandı",
    TemplateDeleted: "Şablon silindi",
    TemplateDraftSaved: "Taslak kaydedildi",
    TemplateFavorited: "Şablon favorilere eklendi",
    TemplatePublished: "Şablon yayınlandı",
    TemplateRestorationRequested: "Geri yükleme istendi",
    TemplateRestored: "Şablon geri yüklendi",
    TemplateRevisionCreated: "Yeni taslak oluşturuldu",
    TemplateUnfavorited: "Şablon favorilerden çıkarıldı",
    TemplateUpdated: "Şablon güncellendi",
    TemplateVersionArchived: "Sürüm arşivlendi",
    TemplateVersionDeleted: "Sürüm silindi",
    UserCreated: "Kullanıcı oluşturuldu",
    UserPasswordResetIssued: "Kurulum bağlantısı oluşturuldu",
    UserTemporaryPasswordIssued: "Geçici parola atandı",
    UserUpdated: "Kullanıcı güncellendi",
    VendorCreated: "Tedarikçi oluşturuldu",
    VendorDeleted: "Tedarikçi silindi",
    VendorUpdated: "Tedarikçi güncellendi",
};

const entityLabelsTr: Record<string, string> = {
    ImportSession: "CSV içe aktarımı",
    LabelTemplate: "Şablon",
    LabelTemplateVersion: "Şablon sürümü",
    PrintIntent: "Baskı talebi",
    Product: "Ürün",
    ProductCategory: "Kategori",
    ProductTemplate: "Ürün şablonu",
    Role: "Rol",
    TemplateCategory: "Şablon kategorisi",
    TemplateRestorationRequest: "Geri yükleme talebi",
    User: "Kullanıcı",
    Vendor: "Tedarikçi",
};

/** "PrintIntentUserPrinted" → "Print intent user printed" for codes without a translation. */
function humanize(code: string) {
    const words = code.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function AuditLogsPage() {
    const { formatDateTime, locale } = useI18n();
    const actionLabel = (code: string) => (locale === "tr" ? actionLabelsTr[code] : undefined) ?? humanize(code);
    const entityLabel = (code: string) => (locale === "tr" ? entityLabelsTr[code] : undefined) ?? humanize(code);
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
            title: "Denetim kaydı",
            description: "Sistemde yapılan her işlemin değiştirilemez kaydı.",
            actionContains: "İşlem ara",
            allTypes: "Tüm kayıt türleri",
            from: "Başlangıç tarihi",
            to: "Bitiş tarihi",
            apply: "Uygula",
            emptyTitle: "Kayıt bulunamadı",
            emptyDescription: "Filtreleri değiştirin veya tarih aralığını genişletin.",
            timestamp: "Zaman",
            action: "İşlem",
            entity: "Kayıt türü",
            actor: "Kullanıcı",
            correlation: "İzleme kimliği",
            open: "Aç",
            system: "Sistem",
            total: "{count} kayıt",
            previous: "Önceki",
            next: "Sonraki",
            page: "{page} / {total}",
            detail: "Kayıt ayrıntısı",
            entityType: "Kayıt türü",
            entityId: "Kayıt kimliği",
            details: "Ayrıntılar",
            metadata: "Ek veri",
        }
        : {
            title: "Audit log",
            description: "A permanent record of every action taken in the system.",
            actionContains: "Search actions",
            allTypes: "All record types",
            from: "From date",
            to: "To date",
            apply: "Apply",
            emptyTitle: "No records found",
            emptyDescription: "Change the filters or widen the date range.",
            timestamp: "Time",
            action: "Action",
            entity: "Record type",
            actor: "User",
            correlation: "Trace ID",
            open: "Open",
            system: "System",
            total: "{count} records",
            previous: "Previous",
            next: "Next",
            page: "{page} / {total}",
            detail: "Record detail",
            entityType: "Record type",
            entityId: "Record ID",
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
                        right={!loading ? <span className="tabular text-sm text-ink-3">{text.total.replace("{count}", meta.totalCount.toLocaleString(locale === "tr" ? "tr-TR" : "en-US"))}</span> : null}
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
                                    <td className="px-4 py-2.5 text-base text-ink">{actionLabel(log.action)}</td>
                                    <td className="px-4 py-2.5 text-base text-ink-2">{entityLabel(log.entityType)}</td>
                                    <td className="max-w-48 truncate px-4 py-2.5 text-base text-ink-2" title={log.userId || undefined}>{log.userId || text.system}</td>
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
                                {text.page.replace("{page}", String(meta.page)).replace("{total}", String(meta.totalPages))}
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
                                    <dd className="break-all text-ink">{selected.userId || text.system}</dd>
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
                    ) : null}
                </SlideOver>
            </div>
        </RoleGuard>
    );
}
