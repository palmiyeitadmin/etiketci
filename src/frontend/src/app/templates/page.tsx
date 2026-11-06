"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CaretRight, CaretDown, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { TemplateCloneModal } from "@/components/Templates/TemplateCloneModal";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { ensureEditableVersion, resolveTemplateCloneSourceVersion, resolveTemplatePrintVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateStatus, TemplateVersion } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TemplatePreviewCard } from "@/components/Templates/TemplatePreviewCard";

type TemplateListStatusFilter = "all" | TemplateStatus | "DraftOnly";
type VersionActionTarget = { template: LabelTemplate; version: TemplateVersion };

function getActionButtonClass(tone: "neutral" | "info" | "warning" | "danger" | "primary" | "success" = "neutral") {
    switch (tone) {
        case "info":
            return "inline-flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-accent/25 bg-accent/10 px-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20";
        case "warning":
            return "inline-flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-warn/25 bg-warn/10 px-2.5 text-xs font-medium text-warn transition-colors hover:bg-warn/20";
        case "danger":
            return "inline-flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-bad/20 bg-bad/10 px-2.5 text-xs font-medium text-bad transition-colors hover:bg-bad/20";
        case "primary":
            return "inline-flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-accent/30 bg-accent px-2.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover";
        case "success":
            return "inline-flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-good/25 bg-good/10 px-2.5 text-xs font-medium text-good transition-colors hover:bg-good/20";
        default:
            return "inline-flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-line bg-raised px-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-raised";
    }
}

function canArchiveVersion(template: LabelTemplate, version: TemplateVersion) {
    return !template.isArchived && template.currentActiveVersionId !== version.id && (version.status === "Rejected" || version.status === "Deprecated");
}

function canDeleteVersion(template: LabelTemplate, version: TemplateVersion) {
    return template.currentActiveVersionId !== version.id && version.status === "Draft" && (template.versions?.length ?? 0) > 1;
}

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
            manageCategories: "Şablon Kategorileri",
            open: "Aç",
            preview: "Önizle",
            print: "Yazdır",
            clone: "Klonla",
            archive: "Arşivle",
            delete: "Sil",
            activeVersionRequired: "Aktif sürüm gerekli",
            archiveTitle: "Şablonu arşivle",
            archiveDescription: (name: string) => `${name} ana listeden çıkacak, geçmiş sürümleri korunacak ve arşiv ekranından geri alınabilecek.`,
            archiveConfirm: "Şablonu Arşivle",
            deleteTitle: "Şablonu sil",
            deleteDescription: (name: string) => `${name} kalıcı olarak silinecek. Bu işlem yalnızca güvenli taslak kayıtlarında desteklenir.`,
            deleteConfirm: "Kalıcı Olarak Sil",
            uncategorized: "Kategori yok",
            ownership: "Yönetim",
            activeLifecycle: "Sürüm / Yaşam",
            createdBy: "Oluşturan",
            lastEditedBy: "Son Düzenleyen",
            version: "Versiyon",
            status: "Durum",
            date: "Tarih",
            notes: "Notlar",
            filtersFavorites: "Favoriler",
            filtersMine: "Benimkiler",
            filtersReset: "Temizle",
            allStatuses: "Tüm durumlar",
            allCategories: "Tüm kategoriler",
            favorite: "Favoriye ekle",
            unfavorite: "Favoriden çıkar",
            favoriteAdded: "Şablon favorilere eklendi.",
            favoriteRemoved: "Şablon favorilerden çıkarıldı.",
            draftOnly: "Sadece taslak",
            versionArchiveTitle: "Sürümü arşivle",
            versionArchiveDescription: (name: string, version: number) => `${name} içindeki v${version} sürümü arşivlenecek ve normal liste akışından çıkacak.`,
            versionArchiveConfirm: "Sürümü Arşivle",
            versionDeleteTitle: "Sürümü sil",
            versionDeleteDescription: (name: string, version: number) => `${name} içindeki v${version} taslağı kalıcı olarak silinecek.`,
            versionDeleteConfirm: "Sürümü Sil",
        }
        : {
            category: "Category",
            actions: "Actions",
            manageCategories: "Template Categories",
            open: "Open",
            preview: "Preview",
            print: "Print",
            clone: "Clone",
            archive: "Archive",
            delete: "Delete",
            activeVersionRequired: "Active version required",
            archiveTitle: "Archive template",
            archiveDescription: (name: string) => `${name} will leave the active list, keep its history and remain restorable from the archive view.`,
            archiveConfirm: "Archive Template",
            deleteTitle: "Delete template",
            deleteDescription: (name: string) => `${name} will be permanently deleted. This is only supported for safe draft-only records.`,
            deleteConfirm: "Delete Permanently",
            uncategorized: "Uncategorized",
            ownership: "Ownership",
            activeLifecycle: "Version / Lifecycle",
            createdBy: "Created By",
            lastEditedBy: "Last Edited By",
            version: "Version",
            status: "Status",
            date: "Date",
            notes: "Notes",
            filtersFavorites: "Favorites",
            filtersMine: "Mine",
            filtersReset: "Reset",
            allStatuses: "All statuses",
            allCategories: "All categories",
            favorite: "Add to favorites",
            unfavorite: "Remove favorite",
            favoriteAdded: "Template added to favorites.",
            favoriteRemoved: "Template removed from favorites.",
            draftOnly: "Draft only",
            versionArchiveTitle: "Archive version",
            versionArchiveDescription: (name: string, version: number) => `Version v${version} of ${name} will be archived and removed from the active list flow.`,
            versionArchiveConfirm: "Archive Version",
            versionDeleteTitle: "Delete version",
            versionDeleteDescription: (name: string, version: number) => `Draft version v${version} of ${name} will be permanently deleted.`,
            versionDeleteConfirm: "Delete Version",
        };

    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
    const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<LabelTemplate | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<LabelTemplate | null>(null);
    const [archiveVersionTarget, setArchiveVersionTarget] = useState<VersionActionTarget | null>(null);
    const [deleteVersionTarget, setDeleteVersionTarget] = useState<VersionActionTarget | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [cloneTarget, setCloneTarget] = useState<{ template: LabelTemplate; version: TemplateVersion } | null>(null);
    const [statusFilter, setStatusFilter] = useState<TemplateListStatusFilter>("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [mineOnly, setMineOnly] = useState(false);

    const filterChipClass =
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors";

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

    const viewerIdentityCandidates = useMemo(() => {
        const user = (session?.user as any) || {};
        return [user.fullName, user.name, user.email]
            .filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
            .map((value) => value.trim().toLowerCase());
    }, [session]);

    const categoryOptions = useMemo(() => {
        const map = new Map<string, { id: string; label: string }>();
        templates.forEach((template) => {
            if (template.templateCategoryId && !map.has(template.templateCategoryId)) {
                map.set(template.templateCategoryId, {
                    id: template.templateCategoryId,
                    label: template.templateCategoryName
                        ? `${template.templateCategoryCode || "-"} · ${template.templateCategoryName}`
                        : template.templateCategoryCode || text.uncategorized,
                });
            }
        });

        return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
    }, [templates, text.uncategorized]);

    const filteredTemplates = useMemo(
        () =>
            templates.filter((template) => {
                const searchMatches = [
                    template.code,
                    template.name,
                    template.description ?? "",
                    template.templateCategoryCode ?? "",
                    template.templateCategoryName ?? "",
                ].join(" ").toLowerCase().includes(searchTerm.toLowerCase());

                if (!searchMatches) {
                    return false;
                }

                const effectiveStatus =
                    template.currentActiveVersion?.status ||
                    template.latestVersion?.status ||
                    [...(template.versions || [])].sort((left, right) => right.versionNumber - left.versionNumber)[0]?.status;

                if (statusFilter === "DraftOnly") {
                    if (template.currentActiveVersion || effectiveStatus !== "Draft") {
                        return false;
                    }
                } else if (statusFilter !== "all" && effectiveStatus !== statusFilter) {
                    return false;
                }

                if (categoryFilter !== "all" && template.templateCategoryId !== categoryFilter) {
                    return false;
                }

                if (favoritesOnly && !template.isFavorite) {
                    return false;
                }

                if (mineOnly) {
                    const createdBy = template.createdBy?.trim().toLowerCase();
                    if (!createdBy || !viewerIdentityCandidates.includes(createdBy)) {
                        return false;
                    }
                }

                return true;
            }),
        [categoryFilter, favoritesOnly, mineOnly, searchTerm, statusFilter, templates, viewerIdentityCandidates]
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

    async function handleArchiveVersionConfirm() {
        if (!archiveVersionTarget) return;
        setSubmitting(true);
        const res = await apiFetch(`/api/Templates/${archiveVersionTarget.template.id}/versions/${archiveVersionTarget.version.id}/archive`, {
            method: "POST",
        });
        setSubmitting(false);
        if (!res.success) {
            setMessage(res.error.message);
            return;
        }

        setArchiveVersionTarget(null);
        await load();
    }

    async function handleDeleteVersionConfirm() {
        if (!deleteVersionTarget) return;
        setSubmitting(true);
        const res = await apiFetch(`/api/Templates/${deleteVersionTarget.template.id}/versions/${deleteVersionTarget.version.id}`, {
            method: "DELETE",
        });
        setSubmitting(false);
        if (!res.success) {
            setMessage(res.error.message);
            return;
        }

        setDeleteVersionTarget(null);
        await load();
    }

    function handlePrintVersion(template: LabelTemplate, version?: TemplateVersion | null) {
        if (!version) {
            setMessage(text.activeVersionRequired);
            return;
        }

        // Printing goes through the preview page: pick a product, check readiness, open a print request.
        router.push(`/templates/${template.id}/preview?versionId=${version.id}`);
    }

    function handleClone(template: LabelTemplate, preferredVersion?: TemplateVersion) {
        const sourceVersion = resolveTemplateCloneSourceVersion(template, preferredVersion);
        if (!sourceVersion) {
            setMessage(t("templates.detailPage.noVersionsDescription"));
            return;
        }

        setCloneTarget({ template, version: sourceVersion });
    }

    function updateLocalTemplateFavorite(templateId: string, isFavorite: boolean) {
        setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, isFavorite } : template));
        setSelectedTemplate((current) => current && current.id === templateId ? { ...current, isFavorite } : current);
    }

    async function handleToggleFavorite(template: LabelTemplate) {
        const nextFavoriteState = !template.isFavorite;
        updateLocalTemplateFavorite(template.id, nextFavoriteState);

        const res = await apiFetch(`/api/Templates/${template.id}/favorite`, {
            method: nextFavoriteState ? "POST" : "DELETE",
        });

        if (!res.success) {
            updateLocalTemplateFavorite(template.id, !nextFavoriteState);
            setMessage(res.error.message);
            return;
        }

        setMessage(nextFavoriteState ? text.favoriteAdded : text.favoriteRemoved);
    }

    function resetFilters() {
        setStatusFilter("all");
        setCategoryFilter("all");
        setFavoritesOnly(false);
        setMineOnly(false);
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto w-full max-w-[1720px] px-2 sm:px-4 lg:px-6 xl:px-8 space-y-6">
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
                    <div className="rounded-lg border border-warn/20 bg-warn/10 p-4 text-sm font-medium text-warn">
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
                    right={
                        <>
                            <select className="plms-select min-w-[170px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TemplateListStatusFilter)}>
                                <option value="all">{text.allStatuses}</option>
                                <option value="Draft">{t("status.generic.Draft")}</option>
                                <option value="InReview">{t("status.generic.InReview")}</option>
                                <option value="Approved">{t("status.generic.Approved")}</option>
                                <option value="Published">{t("status.generic.Published")}</option>
                                <option value="Deprecated">{t("status.generic.Deprecated")}</option>
                                <option value="DraftOnly">{text.draftOnly}</option>
                            </select>
                            <select className="plms-select min-w-[190px]" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                                <option value="all">{text.allCategories}</option>
                                {categoryOptions.map((category) => (
                                    <option key={category.id} value={category.id}>{category.label}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className={`${filterChipClass} ${favoritesOnly ? "border-warn/40 bg-warn/15 text-warn" : "border-line bg-raised text-ink-2"}`}
                                onClick={() => setFavoritesOnly((current) => !current)}
                            >
                                {text.filtersFavorites}
                            </button>
                            <button
                                type="button"
                                className={`${filterChipClass} ${mineOnly ? "border-accent/40 bg-accent/15 text-ink" : "border-line bg-raised text-ink-2"}`}
                                onClick={() => setMineOnly((current) => !current)}
                            >
                                {text.filtersMine}
                            </button>
                            <button type="button" className="plms-button-compact" onClick={resetFilters}>
                                {text.filtersReset}
                            </button>
                        </>
                    }
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <EmptyState
                        title={t("templates.emptyTitle")}
                        description={t("templates.emptyDescription")}
                    />
                ) : (
                    <DataTable columns={["", t("templates.table.code"), t("templates.table.template"), text.activeLifecycle, text.ownership, text.actions]}>
                        {filteredTemplates.map((template) => {
                            const effectiveStatus =
                                template.currentActiveVersion?.status ||
                                template.latestVersion?.status ||
                                [...(template.versions || [])].sort((left, right) => right.versionNumber - left.versionNumber)[0]?.status ||
                                "Draft";
                            const status = !template.currentActiveVersion && effectiveStatus === "Draft" ? "DraftOnly" : effectiveStatus;
                            const isExpanded = expandedRowId === template.id;
                            const printableVersion = resolveTemplatePrintVersion(template);
                            const cloneVersion = resolveTemplateCloneSourceVersion(template);
                            
                            return (
                                <React.Fragment key={template.id}>
                                <tr className="cursor-pointer transition-colors hover:bg-white/5" onClick={() => setSelectedTemplate(template)}>
                                    <td className="pl-6 pr-2 py-4 w-10 text-center" onClick={(e) => { e.stopPropagation(); setExpandedRowId(isExpanded ? null : template.id); }}>
                                        <button type="button" className="flex h-6 w-6 items-center justify-center rounded-full bg-raised hover:bg-raised transition-colors text-ink-2">
                                            {isExpanded ? <CaretDown weight="bold" /> : <CaretRight weight="bold" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">
                                            {template.code}
                                        </span>
                                        <div className="mt-2 text-sm font-medium text-ink">{template.templateCategoryCode || "-"}</div>
                                            <div className="mt-1 text-xs text-ink-3">
                                            {template.templateCategoryName || text.uncategorized}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 min-w-[240px] xl:min-w-[280px]">
                                        <div className="text-sm font-medium text-ink">{template.name}</div>
                                        <div className="mt-1 text-xs text-ink-3">
                                            {template.description || t("templates.detail.noDescription")}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm font-medium text-ink-2">
                                            {template.currentActiveVersion
                                                ? `v${template.currentActiveVersion.versionNumber}`
                                                : template.latestVersion
                                                    ? `v${template.latestVersion.versionNumber}`
                                                    : "-"}
                                        </div>
                                        <div className="mt-2">
                                        <StatusBadge
                                            label={status}
                                            tone={
                                                status === "Published"
                                                    ? "success"
                                                    : status === "Approved" || status === "InReview"
                                                        ? "info"
                                                        : status === "Deprecated" || status === "Archived"
                                                            ? "danger"
                                                            : "warning"
                                            }
                                        />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 min-w-[170px]">
                                        <div className="text-xs font-medium text-ink-3">
                                            {text.createdBy}
                                        </div>
                                        <div className="mt-1 text-sm font-medium text-ink">{template.createdBy || "-"}</div>
                                        <div className="mt-1 text-xs text-ink-3">
                                            {formatDate(template.createdAt)}
                                        </div>
                                        <div className="mt-3 text-xs font-medium text-ink-3">
                                            {text.lastEditedBy}
                                        </div>
                                        <div className="mt-1 text-sm font-medium text-ink">{template.lastUpdatedBy || "-"}</div>
                                        <div className="mt-1 text-xs text-ink-3">
                                            {formatDate(template.updatedAt)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 w-[1%]">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                                            <button
                                                type="button"
                                                className={`${getActionButtonClass()} px-2 ${template.isFavorite ? "border-warn/40 bg-warn/15 text-warn" : ""}`}
                                                onClick={() => void handleToggleFavorite(template)}
                                                title={template.isFavorite ? text.unfavorite : text.favorite}
                                                aria-label={template.isFavorite ? text.unfavorite : text.favorite}
                                            >
                                                <Star size={14} weight={template.isFavorite ? "fill" : "regular"} />
                                            </button>
                                            <Link href={`/templates/${template.id}`} className={getActionButtonClass()}>
                                                {text.open}
                                            </Link>
                                            <button
                                                type="button"
                                                className={getActionButtonClass("info")}
                                                onClick={() => handlePrintVersion(template, printableVersion)}
                                                disabled={!printableVersion}
                                                title={!printableVersion ? text.activeVersionRequired : undefined}
                                            >
                                                {text.print}
                                            </button>
                                            {canCreate ? (
                                                <button
                                                    type="button"
                                                    className={getActionButtonClass()}
                                                    onClick={() => handleClone(template, cloneVersion)}
                                                    disabled={!cloneVersion}
                                                >
                                                    {text.clone}
                                                </button>
                                            ) : null}
                                            {canArchive ? (
                                                <button type="button" className={getActionButtonClass("warning")} onClick={() => setArchiveTarget(template)}>
                                                    {text.archive}
                                                </button>
                                            ) : null}
                                            {canDelete ? (
                                                <button
                                                    type="button"
                                                    className={getActionButtonClass("danger")}
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
                                        <td colSpan={6} className="bg-black/20 p-4 border-b border-line pt-2 pb-6">
                                            <div className="rounded-xl border border-line overflow-hidden bg-raised ml-[3.25rem]">
                                                <table className="w-full text-left text-sm text-ink-3">
                                                    <thead className="bg-raised text-xs font-medium border-b border-line">
                                                        <tr>
                                                            <th className="px-5 py-3">{text.version}</th>
                                                            <th className="px-5 py-3">{text.status}</th>
                                                            <th className="px-5 py-3">{text.createdBy}</th>
                                                            <th className="px-5 py-3">{text.date}</th>
                                                            <th className="px-5 py-3">{text.notes}</th>
                                                            <th className="px-5 py-3">{text.actions}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[color:var(--plms-border)]">
                                                        {[...template.versions].sort((a,b) => b.versionNumber - a.versionNumber).map(v => (
                                                            <tr key={v.id} className="hover:bg-white/5 transition-colors">
                                                                <td className="px-5 py-3 font-medium text-ink">v{v.versionNumber}</td>
                                                                <td className="px-5 py-3">
                                                                    <StatusBadge label={v.status} tone={v.status === "Published" ? "success" : v.status === "InReview" ? "info" : "warning"} />
                                                                </td>
                                                                <td className="px-5 py-3 font-medium text-ink-2">{v.createdBy || "-"}</td>
                                                                <td className="px-5 py-3">{formatDate(v.createdAt)}</td>
                                                                <td className="px-5 py-3 text-xs opacity-75">{v.changeNotes || "-"}</td>
                                                                <td className="px-5 py-3">
                                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                        <Link href={`/templates/${template.id}/preview?versionId=${v.id}`} className={getActionButtonClass()}>
                                                                            {text.preview}
                                                                        </Link>
                                                                        <button type="button" className={getActionButtonClass("info")} onClick={() => handlePrintVersion(template, v)}>
                                                                            {text.print}
                                                                        </button>
                                                                        {canCreate ? (
                                                                            <button type="button" className={getActionButtonClass()} onClick={() => handleClone(template, v)}>
                                                                                {text.clone}
                                                                            </button>
                                                                        ) : null}
                                                                        <button
                                                                            type="button"
                                                                            className={`${getActionButtonClass()} px-2 ${template.isFavorite ? "border-warn/40 bg-warn/15 text-warn" : ""}`}
                                                                            onClick={() => void handleToggleFavorite(template)}
                                                                            title={template.isFavorite ? text.unfavorite : text.favorite}
                                                                            aria-label={template.isFavorite ? text.unfavorite : text.favorite}
                                                                        >
                                                                            <Star size={14} weight={template.isFavorite ? "fill" : "regular"} />
                                                                        </button>
                                                                        {canArchive && canArchiveVersion(template, v) ? (
                                                                            <button
                                                                                type="button"
                                                                                className={getActionButtonClass("warning")}
                                                                                onClick={() => setArchiveVersionTarget({ template, version: v })}
                                                                            >
                                                                                {text.archive}
                                                                            </button>
                                                                        ) : null}
                                                                        {canDelete && canDeleteVersion(template, v) ? (
                                                                            <button
                                                                                type="button"
                                                                                className={getActionButtonClass("danger")}
                                                                                onClick={() => setDeleteVersionTarget({ template, version: v })}
                                                                            >
                                                                                {text.delete}
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
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

                        <section className="rounded-xl border border-line bg-raised p-5">
                            <div className="text-xs font-medium text-ink-3">{t("templates.detail.lifecycleSnapshot")}</div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <StatusBadge label={selectedTemplate.currentActiveVersion ? "Published" : selectedTemplate.inReviewCount ? "InReview" : "DraftOnly"} tone={selectedTemplate.currentActiveVersion ? "success" : selectedTemplate.inReviewCount ? "info" : "warning"} />
                                {selectedTemplate.latestVersion ? <StatusBadge label={`Latest ${selectedTemplate.latestVersion.status}`} tone="neutral" /> : null}
                            </div>
                            <div className="mt-4 text-sm text-ink-3">{selectedTemplate.description || t("templates.detail.noLifecycleDescription")}</div>
                        </section>

                        <section className="rounded-xl border border-line bg-raised p-5">
                            <div className="text-xs font-medium text-ink-3">{t("templates.detail.quickActions")}</div>
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

            <ConfirmModal
                open={Boolean(archiveVersionTarget)}
                title={text.versionArchiveTitle}
                description={text.versionArchiveDescription(archiveVersionTarget?.template.name || "", archiveVersionTarget?.version.versionNumber || 0)}
                confirmLabel={text.versionArchiveConfirm}
                tone="primary"
                onCancel={() => setArchiveVersionTarget(null)}
                onConfirm={() => void handleArchiveVersionConfirm()}
                loading={submitting}
            />

            <ConfirmModal
                open={Boolean(deleteVersionTarget)}
                title={text.versionDeleteTitle}
                description={text.versionDeleteDescription(deleteVersionTarget?.template.name || "", deleteVersionTarget?.version.versionNumber || 0)}
                confirmLabel={text.versionDeleteConfirm}
                onCancel={() => setDeleteVersionTarget(null)}
                onConfirm={() => void handleDeleteVersionConfirm()}
                loading={submitting}
            />

            <TemplateCloneModal
                open={cloneTarget !== null}
                sourceTemplate={cloneTarget?.template || null}
                sourceVersion={cloneTarget?.version || null}
                onClose={() => setCloneTarget(null)}
                onCloned={(templateId) => router.push(`/templates/${templateId}`)}
            />
        </RoleGuard>
    );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-line bg-raised p-4">
            <div className="text-xs font-medium text-ink-3">{label}</div>
            <div className="mt-2 text-xl font-medium text-ink">{value}</div>
        </div>
    );
}
