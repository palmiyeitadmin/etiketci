"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CaretRight, CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { ensureEditableVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TemplatePreviewCard } from "@/components/Templates/TemplatePreviewCard";

export default function TemplatesPage() {
    const { data: session } = useSession();
    const { formatDate, t, locale } = useI18n();
    const router = useRouter();
    const roles = ((session?.user as any)?.roles || []) as string[];
    const grantedPermissions = ((session?.user as any)?.permissions || []) as string[];
    const canCreate = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesCreate]);
    const canEdit = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesEdit]);
    const canArchive = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesArchive]);
    const canDelete = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesDelete]);

    const text = locale === "tr"
        ? {
            category: "Kategori",
            actions: "Aksiyonlar",
            manageCategories: "Sablon Kategorileri",
            open: "Ac",
            archive: "Arsivle",
            delete: "Sil",
            archiveTitle: "Sablonu arsivle",
            archiveDescription: (name: string) => `${name} ana listeden cikacak, gecmis surumleri korunacak ve arsiv ekranindan geri alinabilecek.`,
            archiveConfirm: "Sablonu Arsivle",
            deleteTitle: "Sablonu sil",
            deleteDescription: (name: string) => `${name} kalici olarak silinecek. Bu islem yalnizca guvenli taslak kayitlarinda desteklenir.`,
            deleteConfirm: "Kalici Olarak Sil",
            uncategorized: "Kategori yok",
            createdBy: "Olusturan",
            lastEditedBy: "Son Duzenleyen",
            version: "Versiyon",
            status: "Durum",
            date: "Tarih",
            notes: "Notlar",
        }
        : {
            category: "Category",
            actions: "Actions",
            manageCategories: "Template Categories",
            open: "Open",
            archive: "Archive",
            delete: "Delete",
            archiveTitle: "Archive template",
            archiveDescription: (name: string) => `${name} will leave the active list, keep its history and remain restorable from the archive view.`,
            archiveConfirm: "Archive Template",
            deleteTitle: "Delete template",
            deleteDescription: (name: string) => `${name} will be permanently deleted. This is only supported for safe draft-only records.`,
            deleteConfirm: "Delete Permanently",
            uncategorized: "Uncategorized",
            createdBy: "Created By",
            lastEditedBy: "Last Edited By",
            version: "Version",
            status: "Status",
            date: "Date",
            notes: "Notes",
        };

    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
    const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<LabelTemplate | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<LabelTemplate | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        const res = await apiFetch<LabelTemplate[]>("/api/Templates");
        if (res.success) {
            setTemplates(res.data.map(normalizeLabelTemplate));
            setMessage(null);
        } else {
            setMessage(res.error.message);
        }
        setLoading(false);
    }

    useEffect(() => {
        void load();
    }, []);

    const filteredTemplates = useMemo(
        () =>
            templates.filter((template) =>
                [
                    template.code,
                    template.name,
                    template.description ?? "",
                    template.templateCategoryCode ?? "",
                    template.templateCategoryName ?? "",
                ].join(" ").toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [templates, searchTerm]
    );

    const previewVersion: TemplateVersion | undefined = selectedTemplate?.currentActiveVersion || selectedTemplate?.latestVersion || selectedTemplate?.versions?.[0];

    async function handleOpenEditor(templateId: string) {
        setOpeningTemplateId(templateId);
        try {
            const res = await apiFetch<LabelTemplate>(`/api/Templates/${templateId}`);
            if (!res.success) {
                setMessage(res.error.message);
                return;
            }

            const normalizedTemplate = normalizeLabelTemplate(res.data);
            const draft = await ensureEditableVersion(normalizedTemplate);
            router.push(`/templates/${templateId}/edit?versionId=${draft.id}`);
        } finally {
            setOpeningTemplateId(null);
        }
    }

    async function handleArchiveConfirm() {
        if (!archiveTarget) return;
        setSubmitting(true);
        const res = await apiFetch(`/api/Templates/${archiveTarget.id}/archive`, { method: "POST" });
        setSubmitting(false);
        if (!res.success) {
            setMessage(res.error.message);
            return;
        }

        if (selectedTemplate?.id === archiveTarget.id) {
            setSelectedTemplate(null);
        }
        setArchiveTarget(null);
        await load();
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setSubmitting(true);
        const res = await apiFetch(`/api/Templates/${deleteTarget.id}`, { method: "DELETE" });
        setSubmitting(false);
        if (!res.success) {
            setMessage(res.error.message);
            return;
        }

        if (selectedTemplate?.id === deleteTarget.id) {
            setSelectedTemplate(null);
        }
        setDeleteTarget(null);
        await load();
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow={t("templates.eyebrow")}
                    title={t("templates.title")}
                    description={t("templates.description")}
                    actions={
                        <>
                            {canCreate ? (
                                <Link href="/templates/categories" className="plms-button-secondary">
                                    {text.manageCategories}
                                </Link>
                            ) : null}
                            {canCreate ? (
                                <Link href="/templates/new" className="plms-button-primary">
                                    {t("templates.newTemplate")}
                                </Link>
                            ) : null}
                        </>
                    }
                />

                {message ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">
                        {message}
                    </div>
                ) : null}

                <FilterBar
                    left={
                        <input
                            className="plms-input max-w-xl"
                            placeholder={t("templates.searchPlaceholder")}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    }
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <EmptyState
                        title={t("templates.emptyTitle")}
                        description={t("templates.emptyDescription")}
                    />
                ) : (
                    <DataTable columns={["", t("templates.table.code"), text.category, t("templates.table.template"), t("templates.table.activeVersion"), t("templates.table.lifecycle"), text.createdBy, text.lastEditedBy, text.actions]}>
                        {filteredTemplates.map((template) => {
                            const status = template.currentActiveVersion ? "Published" : template.inReviewCount ? "InReview" : "DraftOnly";
                            const isExpanded = expandedRowId === template.id;
                            
                            return (
                                <React.Fragment key={template.id}>
                                <tr className="cursor-pointer transition-colors hover:bg-white/5" onClick={() => setSelectedTemplate(template)}>
                                    <td className="pl-6 pr-2 py-4 w-10 text-center" onClick={(e) => { e.stopPropagation(); setExpandedRowId(isExpanded ? null : template.id); }}>
                                        <button type="button" className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400">
                                            {isExpanded ? <CaretDown weight="bold" /> : <CaretRight weight="bold" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">
                                            {template.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-white">{template.templateCategoryCode || "-"}</div>
                                            <div className="mt-1 text-xs text-[color:var(--plms-text-subtle)]">
                                            {template.templateCategoryName || text.uncategorized}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-white">{template.name}</div>
                                        <div className="mt-1 text-xs text-[color:var(--plms-text-subtle)]">
                                            {template.description || t("templates.detail.noDescription")}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
                                        {template.currentActiveVersion ? `v${template.currentActiveVersion.versionNumber}` : "-"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge label={status} tone={template.currentActiveVersion ? "success" : template.inReviewCount ? "info" : "warning"} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-white">{template.createdBy || "-"}</div>
                                        <div className="mt-1 text-xs text-[color:var(--plms-text-subtle)]">
                                            {formatDate(template.createdAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-white">{template.lastUpdatedBy || "-"}</div>
                                        <div className="mt-1 text-xs text-[color:var(--plms-text-subtle)]">
                                            {formatDate(template.updatedAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                                            <Link href={`/templates/${template.id}`} className="plms-button-compact">
                                                {text.open}
                                            </Link>
                                            {canArchive ? (
                                                <button type="button" className="plms-button-compact" onClick={() => setArchiveTarget(template)}>
                                                    {text.archive}
                                                </button>
                                            ) : null}
                                            {canDelete ? (
                                                <button
                                                    type="button"
                                                    className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-200 transition-colors hover:bg-red-500/20"
                                                    onClick={() => setDeleteTarget(template)}
                                                >
                                                    {text.delete}
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                                {isExpanded && template.versions && template.versions.length > 0 && (
                                    <tr>
                                        <td colSpan={9} className="bg-black/20 p-4 border-b border-[color:var(--plms-border)] pt-2 pb-6">
                                            <div className="rounded-xl border border-[color:var(--plms-border)] overflow-hidden bg-[color:var(--plms-panel-2)] ml-[3.25rem]">
                                                <table className="w-full text-left text-sm text-[color:var(--plms-text-subtle)]">
                                                    <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] border-b border-[color:var(--plms-border)]">
                                                        <tr>
                                                            <th className="px-5 py-3">{text.version}</th>
                                                            <th className="px-5 py-3">{text.status}</th>
                                                            <th className="px-5 py-3">{text.createdBy}</th>
                                                            <th className="px-5 py-3">{text.date}</th>
                                                            <th className="px-5 py-3">{text.notes}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[color:var(--plms-border)]">
                                                        {[...template.versions].sort((a,b) => b.versionNumber - a.versionNumber).map(v => (
                                                            <tr key={v.id} className="hover:bg-white/5 transition-colors">
                                                                <td className="px-5 py-3 font-bold text-white">v{v.versionNumber}</td>
                                                                <td className="px-5 py-3">
                                                                    <StatusBadge label={v.status} tone={v.status === "Published" ? "success" : v.status === "InReview" ? "info" : "warning"} />
                                                                </td>
                                                                <td className="px-5 py-3 font-medium text-slate-300">{v.createdBy || "-"}</td>
                                                                <td className="px-5 py-3">{formatDate(v.createdAt)}</td>
                                                                <td className="px-5 py-3 text-xs opacity-75">{v.changeNotes || "-"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            );
                        })}
                    </DataTable>
                )}
            </div>

            <SlideOver
                open={selectedTemplate !== null}
                title={selectedTemplate?.name || t("templates.title")}
                subtitle={selectedTemplate ? `${selectedTemplate.code} · ${selectedTemplate.lastUpdatedBy || t("common.unknown")}` : undefined}
                onClose={() => setSelectedTemplate(null)}
            >
                {selectedTemplate ? (
                    <div className="space-y-6">
                        <TemplatePreviewCard template={selectedTemplate} version={previewVersion} />

                        <section className="grid gap-4 md:grid-cols-2">
                            <DetailMetric label={text.category} value={selectedTemplate.templateCategoryCode ? `${selectedTemplate.templateCategoryCode} · ${selectedTemplate.templateCategoryName}` : "-"} />
                            <DetailMetric label={t("templates.detail.activeVersion")} value={selectedTemplate.currentActiveVersion ? `v${selectedTemplate.currentActiveVersion.versionNumber}` : "-"} />
                            <DetailMetric label={t("templates.detail.latestVersion")} value={selectedTemplate.latestVersion ? `v${selectedTemplate.latestVersion.versionNumber}` : "-"} />
                            <DetailMetric label={t("templates.detail.linkedProducts")} value={String(selectedTemplate.linkedProductCount ?? 0)} />
                            <DetailMetric label={t("templates.detail.publishedCount")} value={String(selectedTemplate.publishedCount ?? 0)} />
                            <DetailMetric label={t("templates.detail.drafts")} value={String(selectedTemplate.draftCount ?? 0)} />
                            <DetailMetric label={t("templates.detail.inReview")} value={String(selectedTemplate.inReviewCount ?? 0)} />
                        </section>

                        <section className="rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detail.lifecycleSnapshot")}</div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <StatusBadge label={selectedTemplate.currentActiveVersion ? "Published" : selectedTemplate.inReviewCount ? "InReview" : "DraftOnly"} tone={selectedTemplate.currentActiveVersion ? "success" : selectedTemplate.inReviewCount ? "info" : "warning"} />
                                {selectedTemplate.latestVersion ? <StatusBadge label={`Latest ${selectedTemplate.latestVersion.status}`} tone="neutral" /> : null}
                            </div>
                            <div className="mt-4 text-sm text-[color:var(--plms-text-subtle)]">{selectedTemplate.description || t("templates.detail.noLifecycleDescription")}</div>
                        </section>

                        <section className="rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detail.quickActions")}</div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                <Link href={`/templates/${selectedTemplate.id}`} className="plms-button-compact">{t("templates.detail.openDetail")}</Link>
                                {canEdit ? (
                                    <button type="button" className="plms-button-compact" onClick={() => void handleOpenEditor(selectedTemplate.id)} disabled={openingTemplateId === selectedTemplate.id}>
                                        {openingTemplateId === selectedTemplate.id ? t("templates.detail.opening") : t("templates.detail.openEditor")}
                                    </button>
                                ) : null}
                                {previewVersion ? <Link href={`/templates/${selectedTemplate.id}/preview?versionId=${previewVersion.id}`} className="plms-button-compact">{t("templates.detail.previewPdf")}</Link> : null}
                            </div>
                        </section>
                    </div>
                ) : null}
            </SlideOver>

            <ConfirmModal
                open={Boolean(archiveTarget)}
                title={text.archiveTitle}
                description={text.archiveDescription(archiveTarget?.name || "")}
                confirmLabel={text.archiveConfirm}
                tone="primary"
                onCancel={() => setArchiveTarget(null)}
                onConfirm={() => void handleArchiveConfirm()}
                loading={submitting}
            />

            <ConfirmModal
                open={Boolean(deleteTarget)}
                title={text.deleteTitle}
                description={text.deleteDescription(deleteTarget?.name || "")}
                confirmLabel={text.deleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => void handleDeleteConfirm()}
                loading={submitting}
            />
        </RoleGuard>
    );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{label}</div>
            <div className="mt-2 text-xl font-black tracking-[-0.04em] text-white">{value}</div>
        </div>
    );
}
