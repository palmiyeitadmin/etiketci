"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CaretDown, CaretRight, Star, User } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { TemplateCloneModal } from "@/components/Templates/TemplateCloneModal";
import { TemplateRowMenu, type RowMenuItem } from "@/components/Templates/TemplateRowMenu";
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
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TemplatePreviewCard } from "@/components/Templates/TemplatePreviewCard";

type TemplateListStatusFilter = "all" | TemplateStatus | "DraftOnly";
type VersionActionTarget = { template: LabelTemplate; version: TemplateVersion };
type Notice = { text: string; tone: "good" | "bad" };

function statusTone(status: string): StatusTone {
    switch (status) {
        case "Published":
            return "success";
        case "Approved":
        case "InReview":
            return "info";
        case "Deprecated":
        case "Archived":
        case "Rejected":
            return "danger";
        default:
            return "warning";
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
            title: "Şablonlar",
            description: "Etiket şablonları ve sürümleri",
            newTemplate: "Yeni şablon",
            searchPlaceholder: "Şablon ara",
            category: "Kategori",
            manageCategories: "Kategoriler",
            open: "Aç",
            openDetail: "Detayı aç",
            openEditor: "Editörü aç",
            opening: "Açılıyor",
            previewPdf: "PDF önizleme",
            preview: "Önizle",
            print: "Yazdır",
            clone: "Klonla",
            archive: "Arşivle",
            delete: "Sil",
            more: "Diğer işlemler",
            showVersions: "Sürümleri göster",
            hideVersions: "Sürümleri gizle",
            activeVersionRequired: "Yazdırmak için yayında bir sürüm gerekli",
            archiveTitle: "Şablonu arşivle",
            archiveDescription: (name: string) => `${name} ana listeden çıkar. Geçmiş sürümleri korunur ve arşivden geri alınabilir.`,
            archiveConfirm: "Arşivle",
            deleteTitle: "Şablonu sil",
            deleteDescription: (name: string) => `${name} kalıcı olarak silinecek. Bu yalnızca taslak dışında sürümü olmayan şablonlarda yapılabilir.`,
            deleteConfirm: "Kalıcı olarak sil",
            uncategorized: "Kategori yok",
            columns: { template: "Şablon", code: "Kod", category: "Kategori", version: "Sürüm", status: "Durum", updated: "Güncellendi" },
            createdBy: "Oluşturan",
            lastEditedBy: "Son düzenleyen",
            version: "Sürüm",
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
            favoriteAdded: "Favorilere eklendi",
            favoriteRemoved: "Favorilerden çıkarıldı",
            draftOnly: "Sadece taslak",
            activeVersion: "Yayındaki sürüm",
            latestVersion: "Son sürüm",
            linkedProducts: "Bağlı ürün",
            publishedCount: "Yayın sayısı",
            drafts: "Taslak",
            inReview: "İncelemede",
            noDescription: "Açıklama yok",
            versionArchiveTitle: "Sürümü arşivle",
            versionArchiveDescription: (name: string, version: number) => `${name} şablonunun v${version} sürümü arşivlenecek ve listeden çıkacak.`,
            versionArchiveConfirm: "Sürümü arşivle",
            versionDeleteTitle: "Sürümü sil",
            versionDeleteDescription: (name: string, version: number) => `${name} şablonunun v${version} taslağı kalıcı olarak silinecek.`,
            versionDeleteConfirm: "Sürümü sil",
        }
        : {
            title: "Templates",
            description: "Label templates and their versions",
            newTemplate: "New template",
            searchPlaceholder: "Search templates",
            category: "Category",
            manageCategories: "Categories",
            open: "Open",
            openDetail: "Open detail",
            openEditor: "Open editor",
            opening: "Opening",
            previewPdf: "PDF preview",
            preview: "Preview",
            print: "Print",
            clone: "Clone",
            archive: "Archive",
            delete: "Delete",
            more: "More actions",
            showVersions: "Show versions",
            hideVersions: "Hide versions",
            activeVersionRequired: "A published version is required to print",
            archiveTitle: "Archive template",
            archiveDescription: (name: string) => `${name} leaves the main list. Its versions are kept and it can be restored from the archive.`,
            archiveConfirm: "Archive",
            deleteTitle: "Delete template",
            deleteDescription: (name: string) => `${name} will be permanently deleted. This only works for templates that have nothing but drafts.`,
            deleteConfirm: "Delete permanently",
            uncategorized: "No category",
            columns: { template: "Template", code: "Code", category: "Category", version: "Version", status: "Status", updated: "Updated" },
            createdBy: "Created by",
            lastEditedBy: "Last edited by",
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
            unfavorite: "Remove from favorites",
            favoriteAdded: "Added to favorites",
            favoriteRemoved: "Removed from favorites",
            draftOnly: "Draft only",
            activeVersion: "Published version",
            latestVersion: "Latest version",
            linkedProducts: "Linked products",
            publishedCount: "Times published",
            drafts: "Drafts",
            inReview: "In review",
            noDescription: "No description",
            versionArchiveTitle: "Archive version",
            versionArchiveDescription: (name: string, version: number) => `Version v${version} of ${name} will be archived and leave the list.`,
            versionArchiveConfirm: "Archive version",
            versionDeleteTitle: "Delete version",
            versionDeleteDescription: (name: string, version: number) => `Draft v${version} of ${name} will be permanently deleted.`,
            versionDeleteConfirm: "Delete version",
        };

    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
    const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);
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

    const setMessage = (value: string | null, tone: Notice["tone"] = "bad") => setNotice(value ? { text: value, tone } : null);

    const toggleChipClass = (pressed: boolean) =>
        `inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors ${
            pressed ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-surface text-ink-2 hover:bg-raised hover:text-ink"
        }`;

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

    const filtersActive = statusFilter !== "all" || categoryFilter !== "all" || favoritesOnly || mineOnly;
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

        setMessage(nextFavoriteState ? text.favoriteAdded : text.favoriteRemoved, "good");
    }

    function resetFilters() {
        setStatusFilter("all");
        setCategoryFilter("all");
        setFavoritesOnly(false);
        setMineOnly(false);
    }

    function templateMenuItems(template: LabelTemplate, cloneVersion?: TemplateVersion): RowMenuItem[] {
        const items: RowMenuItem[] = [{ label: text.openDetail, href: `/templates/${template.id}` }];
        if (canCreate) items.push({ label: text.clone, onSelect: () => handleClone(template, cloneVersion), disabled: !cloneVersion });
        if (canArchive) items.push({ label: text.archive, onSelect: () => setArchiveTarget(template), separated: true });
        if (canDelete) items.push({ label: text.delete, onSelect: () => setDeleteTarget(template), tone: "danger", separated: !canArchive });
        return items;
    }

    function versionMenuItems(template: LabelTemplate, version: TemplateVersion): RowMenuItem[] {
        const items: RowMenuItem[] = [{ label: text.print, onSelect: () => handlePrintVersion(template, version) }];
        if (canCreate) items.push({ label: text.clone, onSelect: () => handleClone(template, version) });
        const archivable = canArchive && canArchiveVersion(template, version);
        if (archivable) items.push({ label: text.archive, onSelect: () => setArchiveVersionTarget({ template, version }), separated: true });
        if (canDelete && canDeleteVersion(template, version)) {
            items.push({ label: text.delete, onSelect: () => setDeleteVersionTarget({ template, version }), tone: "danger", separated: !archivable });
        }
        return items;
    }

    function ownershipTitle(template: LabelTemplate) {
        return [
            `${text.createdBy}: ${template.createdBy || "-"} · ${formatDate(template.createdAt)}`,
            `${text.lastEditedBy}: ${template.lastUpdatedBy || "-"} · ${formatDate(template.updatedAt)}`,
        ].join("\n");
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="flex flex-col gap-6">
                <PageHeader
                    title={text.title}
                    description={text.description}
                    actions={
                        <>
                            {canCreate ? (
                                <Link href="/templates/categories" className="plms-button-secondary">
                                    {text.manageCategories}
                                </Link>
                            ) : null}
                            {canCreate ? (
                                <Link href="/templates/new" className="plms-button-primary">
                                    {text.newTemplate}
                                </Link>
                            ) : null}
                        </>
                    }
                />

                <FilterBar
                    left={
                        <>
                            <input
                                className="plms-input w-full sm:w-72"
                                placeholder={text.searchPlaceholder}
                                aria-label={text.searchPlaceholder}
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                            <select
                                className="plms-select"
                                aria-label={text.status}
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as TemplateListStatusFilter)}
                            >
                                <option value="all">{text.allStatuses}</option>
                                <option value="Draft">{t("status.generic.Draft")}</option>
                                <option value="InReview">{t("status.generic.InReview")}</option>
                                <option value="Approved">{t("status.generic.Approved")}</option>
                                <option value="Published">{t("status.generic.Published")}</option>
                                <option value="Deprecated">{t("status.generic.Deprecated")}</option>
                                <option value="DraftOnly">{text.draftOnly}</option>
                            </select>
                            <select
                                className="plms-select"
                                aria-label={text.category}
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                            >
                                <option value="all">{text.allCategories}</option>
                                {categoryOptions.map((category) => (
                                    <option key={category.id} value={category.id}>{category.label}</option>
                                ))}
                            </select>
                        </>
                    }
                    right={
                        <>
                            <button
                                type="button"
                                aria-pressed={favoritesOnly}
                                className={toggleChipClass(favoritesOnly)}
                                onClick={() => setFavoritesOnly((current) => !current)}
                            >
                                <Star size={16} weight={favoritesOnly ? "fill" : "regular"} />
                                {text.filtersFavorites}
                            </button>
                            <button
                                type="button"
                                aria-pressed={mineOnly}
                                className={toggleChipClass(mineOnly)}
                                onClick={() => setMineOnly((current) => !current)}
                            >
                                <User size={16} weight={mineOnly ? "fill" : "regular"} />
                                {text.filtersMine}
                            </button>
                            <button type="button" className="plms-button-ghost" onClick={resetFilters} disabled={!filtersActive}>
                                {text.filtersReset}
                            </button>
                        </>
                    }
                />

                {notice ? (
                    <div role="status" className={`rounded-lg px-3 py-2 text-sm ${notice.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
                        {notice.text}
                    </div>
                ) : null}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <EmptyState
                        title={t("templates.emptyTitle")}
                        description={t("templates.emptyDescription")}
                    />
                ) : (
                    <DataTable columns={["", text.columns.template, text.columns.code, text.columns.category, text.columns.version, text.columns.status, text.columns.updated, " "]}>
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
                            const shownVersion = template.currentActiveVersion || template.latestVersion;
                            const hasVersions = (template.versions?.length ?? 0) > 0;

                            return (
                                <React.Fragment key={template.id}>
                                    <tr className={`cursor-pointer transition-colors hover:bg-raised ${isExpanded ? "bg-raised" : ""}`} onClick={() => setSelectedTemplate(template)}>
                                        <td className="w-10 py-2.5 pl-3 pr-0">
                                            {hasVersions ? (
                                                <button
                                                    type="button"
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                                                    aria-expanded={isExpanded}
                                                    aria-label={isExpanded ? text.hideVersions : text.showVersions}
                                                    title={isExpanded ? text.hideVersions : text.showVersions}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setExpandedRowId(isExpanded ? null : template.id);
                                                    }}
                                                >
                                                    {isExpanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
                                                </button>
                                            ) : null}
                                        </td>
                                        <td className="min-w-64 px-4 py-2.5">
                                            <Link
                                                href={`/templates/${template.id}`}
                                                className="text-base font-medium text-ink hover:text-accent"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {template.name}
                                            </Link>
                                            <div className="max-w-md truncate text-sm text-ink-3">
                                                {template.description || text.noDescription}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">{template.code}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-base text-ink-2" title={template.templateCategoryCode || undefined}>
                                            {template.templateCategoryName || <span className="text-ink-3">{text.uncategorized}</span>}
                                        </td>
                                        <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">
                                            {shownVersion ? `v${shownVersion.versionNumber}` : "-"}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <StatusBadge label={status} tone={statusTone(status)} />
                                        </td>
                                        <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2" title={ownershipTitle(template)}>
                                            {formatDate(template.updatedAt)}
                                        </td>
                                        <td className="w-px whitespace-nowrap py-2.5 pl-2 pr-3">
                                            <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-sunken ${template.isFavorite ? "text-accent" : "text-ink-3 hover:text-ink"}`}
                                                    onClick={() => void handleToggleFavorite(template)}
                                                    aria-pressed={Boolean(template.isFavorite)}
                                                    title={template.isFavorite ? text.unfavorite : text.favorite}
                                                    aria-label={template.isFavorite ? text.unfavorite : text.favorite}
                                                >
                                                    <Star size={16} weight={template.isFavorite ? "fill" : "regular"} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="plms-button-compact"
                                                    onClick={() => handlePrintVersion(template, printableVersion)}
                                                    disabled={!printableVersion}
                                                    title={!printableVersion ? text.activeVersionRequired : undefined}
                                                >
                                                    {text.print}
                                                </button>
                                                <TemplateRowMenu label={text.more} items={templateMenuItems(template, cloneVersion)} />
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && hasVersions ? (
                                        <tr>
                                            <td colSpan={8} className="bg-canvas px-0 py-0">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-ink-3">
                                                            <th className="h-9 pl-14 pr-4 font-medium">{text.version}</th>
                                                            <th className="h-9 px-4 font-medium">{text.status}</th>
                                                            <th className="h-9 px-4 font-medium">{text.createdBy}</th>
                                                            <th className="h-9 px-4 font-medium">{text.date}</th>
                                                            <th className="h-9 px-4 font-medium">{text.notes}</th>
                                                            <th className="h-9 px-3"><span className="sr-only">{text.more}</span></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-line border-t border-line">
                                                        {[...(template.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber).map((v) => (
                                                            <tr key={v.id} className="transition-colors hover:bg-raised">
                                                                <td className="tabular h-10 whitespace-nowrap py-1.5 pl-14 pr-4 font-mono text-sm text-ink">v{v.versionNumber}</td>
                                                                <td className="px-4 py-1.5"><StatusBadge label={v.status} tone={statusTone(v.status)} /></td>
                                                                <td className="whitespace-nowrap px-4 py-1.5 text-ink-2">{v.createdBy || "-"}</td>
                                                                <td className="tabular whitespace-nowrap px-4 py-1.5 font-mono text-sm text-ink-2">{formatDate(v.createdAt)}</td>
                                                                <td className="max-w-sm truncate px-4 py-1.5 text-ink-3" title={v.changeNotes || undefined}>{v.changeNotes || "-"}</td>
                                                                <td className="w-px whitespace-nowrap py-1.5 pl-2 pr-3">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <Link href={`/templates/${template.id}/preview?versionId=${v.id}`} className="plms-button-compact">
                                                                            {text.preview}
                                                                        </Link>
                                                                        <TemplateRowMenu label={text.more} items={versionMenuItems(template, v)} />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    ) : null}
                                </React.Fragment>
                            );
                        })}
                    </DataTable>
                )}
            </div>

            <SlideOver
                open={selectedTemplate !== null}
                title={selectedTemplate?.name || text.title}
                subtitle={selectedTemplate?.code}
                onClose={() => setSelectedTemplate(null)}
            >
                {selectedTemplate ? (
                    <div className="flex flex-col gap-6">
                        <TemplatePreviewCard template={selectedTemplate} version={previewVersion} />

                        <div className="flex flex-wrap gap-2">
                            <Link href={`/templates/${selectedTemplate.id}`} className="plms-button-primary">{text.openDetail}</Link>
                            {canEdit ? (
                                <button type="button" className="plms-button-secondary" onClick={() => void handleOpenEditor(selectedTemplate.id)} disabled={openingTemplateId === selectedTemplate.id}>
                                    {openingTemplateId === selectedTemplate.id ? text.opening : text.openEditor}
                                </button>
                            ) : null}
                            {previewVersion ? <Link href={`/templates/${selectedTemplate.id}/preview?versionId=${previewVersion.id}`} className="plms-button-secondary">{text.previewPdf}</Link> : null}
                        </div>

                        <p className="text-sm text-ink-2">{selectedTemplate.description || text.noDescription}</p>

                        <dl className="divide-y divide-line border-y border-line text-sm">
                            <DetailRow label={text.status}>
                                <StatusBadge
                                    label={selectedTemplate.currentActiveVersion ? "Published" : selectedTemplate.inReviewCount ? "InReview" : "DraftOnly"}
                                    tone={selectedTemplate.currentActiveVersion ? "success" : selectedTemplate.inReviewCount ? "info" : "warning"}
                                />
                            </DetailRow>
                            <DetailRow label={text.category}>
                                {selectedTemplate.templateCategoryCode ? `${selectedTemplate.templateCategoryCode} · ${selectedTemplate.templateCategoryName}` : "-"}
                            </DetailRow>
                            <DetailRow label={text.activeVersion} mono>
                                {selectedTemplate.currentActiveVersion ? `v${selectedTemplate.currentActiveVersion.versionNumber}` : "-"}
                            </DetailRow>
                            <DetailRow label={text.latestVersion}>
                                {selectedTemplate.latestVersion ? (
                                    <span className="inline-flex items-center gap-3">
                                        <span className="tabular font-mono">v{selectedTemplate.latestVersion.versionNumber}</span>
                                        <StatusBadge label={selectedTemplate.latestVersion.status} tone={statusTone(selectedTemplate.latestVersion.status)} />
                                    </span>
                                ) : "-"}
                            </DetailRow>
                            <DetailRow label={text.linkedProducts} mono>{String(selectedTemplate.linkedProductCount ?? 0)}</DetailRow>
                            <DetailRow label={text.publishedCount} mono>{String(selectedTemplate.publishedCount ?? 0)}</DetailRow>
                            <DetailRow label={text.drafts} mono>{String(selectedTemplate.draftCount ?? 0)}</DetailRow>
                            <DetailRow label={text.inReview} mono>{String(selectedTemplate.inReviewCount ?? 0)}</DetailRow>
                            <DetailRow label={text.createdBy}>
                                {selectedTemplate.createdBy || "-"} <span className="tabular font-mono text-ink-3">· {formatDate(selectedTemplate.createdAt)}</span>
                            </DetailRow>
                            <DetailRow label={text.lastEditedBy}>
                                {selectedTemplate.lastUpdatedBy || t("common.unknown")} <span className="tabular font-mono text-ink-3">· {formatDate(selectedTemplate.updatedAt)}</span>
                            </DetailRow>
                        </dl>
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

function DetailRow({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-ink-2">{label}</dt>
            <dd className={`text-right text-ink ${mono ? "tabular font-mono" : ""}`}>{children}</dd>
        </div>
    );
}
