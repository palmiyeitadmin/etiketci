"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { TemplateCategory } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useI18n } from "@/lib/i18n";
import { TemplateRowMenu } from "@/components/Templates/TemplateRowMenu";

type TemplateCategoryDraft = { id?: string; code: string; name: string; isActive: boolean };

const initialDraft: TemplateCategoryDraft = { code: "", name: "", isActive: true };

export default function TemplateCategoriesPage() {
    const { locale } = useI18n();
    const { data: session } = useSession();
    const roles = ((session?.user as any)?.roles || []) as string[];
    const grantedPermissions = ((session?.user as any)?.permissions || []) as string[];
    const canEdit = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesCreate]);
    const canDelete = roles.includes("Admin");

    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [draft, setDraft] = useState<TemplateCategoryDraft>(initialDraft);
    const [slideoverOpen, setSlideoverOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TemplateCategory | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const text = locale === "tr"
        ? {
            title: "Şablon kategorileri",
            description: "Her kategori, şablon kodlarının ön ekini ve sırasını belirler",
            newCategory: "Yeni kategori",
            searchPlaceholder: "Kategori ara",
            emptyTitle: "Kategori bulunamadı",
            emptyDescription: "Yeni şablonlara kod verilebilmesi için bir kategori tanımlayın.",
            columns: ["Kod", "Ad", "Sıradaki şablon kodu", "Durum", "\u00a0"],
            edit: "Düzenle",
            delete: "Sil",
            more: "Diğer işlemler",
            editCategory: "Kategoriyi düzenle",
            createCategory: "Kategori oluştur",
            slideSubtitle: "Kod, şablon kodlarında kullanılır ve kayıttan sonra değiştirilemez",
            code: "Kod",
            name: "Ad",
            active: "Aktif",
            saving: "Kaydediliyor",
            updateCategory: "Kaydet",
            deleteTitle: "Kategoriyi sil",
            deleteDescription: `${deleteTarget?.name ?? ""} silinecek. Bu kategoriye bağlı şablon varsa silinemez.`,
            deleteConfirm: "Kategoriyi sil",
        }
        : {
            title: "Template categories",
            description: "Each category sets the prefix and sequence of template codes",
            newCategory: "New category",
            searchPlaceholder: "Search categories",
            emptyTitle: "No categories found",
            emptyDescription: "Create a category so new templates can get a code.",
            columns: ["Code", "Name", "Next template code", "Status", "\u00a0"],
            edit: "Edit",
            delete: "Delete",
            more: "More actions",
            editCategory: "Edit category",
            createCategory: "Create category",
            slideSubtitle: "The code is used in template codes and cannot be changed after saving",
            code: "Code",
            name: "Name",
            active: "Active",
            saving: "Saving",
            updateCategory: "Save",
            deleteTitle: "Delete category",
            deleteDescription: `${deleteTarget?.name ?? ""} will be deleted. This is blocked while templates still use it.`,
            deleteConfirm: "Delete category",
        };

    async function load() {
        const res = await apiFetch<TemplateCategory[]>("/api/template-categories");
        if (res.success) {
            setCategories(res.data);
            setMessage(null);
        } else {
            setMessage(res.error.message);
        }
        setLoading(false);
    }

    useEffect(() => {
        void load();
    }, []);

    const filtered = useMemo(
        () => categories.filter((category) => [category.code, category.name].join(" ").toLowerCase().includes(query.toLowerCase())),
        [categories, query]
    );

    const openCreate = () => {
        setDraft(initialDraft);
        setSlideoverOpen(true);
    };

    const openEdit = (category: TemplateCategory) => {
        setDraft({ id: category.id, code: category.code, name: category.name, isActive: category.isActive });
        setSlideoverOpen(true);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);

        const endpoint = draft.id ? `/api/template-categories/${draft.id}` : "/api/template-categories";
        const method = draft.id ? "PUT" : "POST";
        const body = draft.id
            ? { name: draft.name, isActive: draft.isActive }
            : { code: draft.code, name: draft.name, isActive: draft.isActive };

        const res = await apiFetch(endpoint, {
            method,
            body: JSON.stringify(body),
        });

        setSubmitting(false);

        if (res.success) {
            setSlideoverOpen(false);
            setDraft(initialDraft);
            await load();
        } else {
            setMessage(res.error.message);
        }
    };

    const deleteCategory = async () => {
        if (!deleteTarget) return;

        setSubmitting(true);
        const res = await apiFetch(`/api/template-categories/${deleteTarget.id}`, { method: "DELETE" });
        setSubmitting(false);

        if (res.success) {
            setDeleteTarget(null);
            await load();
        } else {
            setMessage(res.error.message);
        }
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="flex flex-col gap-6">
                <PageHeader
                    title={text.title}
                    description={text.description}
                    actions={canEdit ? <button className="plms-button-primary" onClick={openCreate}>{text.newCategory}</button> : null}
                />

                <FilterBar left={<input className="plms-input w-full sm:w-72" placeholder={text.searchPlaceholder} aria-label={text.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />} />

                {message ? (
                    <div role="status" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{message}</div>
                ) : null}

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <DataTable columns={text.columns}>
                        {filtered.map((category) => (
                            <tr key={category.id} className="transition-colors hover:bg-raised">
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink">{category.code}</td>
                                <td className="px-4 py-2.5 text-base text-ink">{category.name}</td>
                                <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">{`PLM-${category.code}-${String(category.nextTemplateSequence).padStart(3, "0")}`}</td>
                                <td className="whitespace-nowrap px-4 py-2.5"><StatusBadge label={category.isActive ? "Active" : "Inactive"} tone={category.isActive ? "success" : "neutral"} /></td>
                                <td className="w-px whitespace-nowrap py-2.5 pl-2 pr-3">
                                    <div className="flex items-center justify-end gap-1">
                                        {canEdit ? <button type="button" className="plms-button-compact" onClick={() => openEdit(category)}>{text.edit}</button> : null}
                                        {canDelete ? (
                                            <TemplateRowMenu label={text.more} items={[{ label: text.delete, onSelect: () => setDeleteTarget(category), tone: "danger" }]} />
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                <SlideOver
                    open={slideoverOpen}
                    title={draft.id ? text.editCategory : text.createCategory}
                    subtitle={text.slideSubtitle}
                    onClose={() => setSlideoverOpen(false)}
                >
                    <form className="flex flex-col gap-5" onSubmit={submit}>
                        <label className="flex flex-col gap-1.5">
                            <span className="plms-label">{text.code}</span>
                            <input className="plms-input font-mono" value={draft.code} disabled={Boolean(draft.id)} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} required />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="plms-label">{text.name}</span>
                            <input className="plms-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-ink">
                            <input type="checkbox" className="h-4 w-4 accent-accent" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                            {text.active}
                        </label>
                        <button className="plms-button-primary self-start" type="submit" disabled={submitting}>{submitting ? text.saving : draft.id ? text.updateCategory : text.createCategory}</button>
                    </form>
                </SlideOver>

                <ConfirmModal
                    open={Boolean(deleteTarget)}
                    title={text.deleteTitle}
                    description={text.deleteDescription.trim()}
                    confirmLabel={text.deleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={() => void deleteCategory()}
                    loading={submitting}
                />
            </div>
        </RoleGuard>
    );
}
