"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { ProductCategory } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useI18n } from "@/lib/i18n";

type CategoryDraft = { id?: string; code: string; name: string; isActive: boolean };

const initialDraft: CategoryDraft = { code: "", name: "", isActive: true };

export default function CategoriesPage() {
    const { locale } = useI18n();
    const { data: session } = useSession();
    const roles = ((session?.user as any)?.roles || []) as string[];
    const grantedPermissions = ((session?.user as any)?.permissions || []) as string[];
    const canEdit = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.categoriesManage]);
    const canDelete = roles.includes("Admin");

    const [items, setItems] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [draft, setDraft] = useState<CategoryDraft>(initialDraft);
    const [slideoverOpen, setSlideoverOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    const text = locale === "tr"
        ? {
            title: "Kategoriler",
            description: "Ürün kategorileri. CSV içe aktarımda kategori kodu buradan eşlenir.",
            newItem: "Yeni kategori",
            emptyTitle: "Kategori bulunamadı",
            emptyDescription: "Aramayı değiştirin veya yeni bir kategori ekleyin.",
            editItem: "Kategoriyi düzenle",
            createItem: "Kategori ekle",
            slideSubtitle: "Kod sonradan değiştirilemez.",
            deleteTitle: "Kategori silinsin mi",
            deleteDescription: (name: string) => `${name} silinecek. Bu kategoriye bağlı ürün varsa silme engellenir.`,
            searchPlaceholder: "Ara",
            columns: ["Kod", "Ad", "Durum", ""],
            edit: "Düzenle",
            delete: "Sil",
            code: "Kod",
            name: "Ad",
            active: "Aktif",
            saving: "Kaydediliyor",
            save: "Kaydet",
            count: (n: number) => `${n} kayıt`,
        }
        : {
            title: "Categories",
            description: "Product categories. CSV imports match category codes against this list.",
            newItem: "New category",
            emptyTitle: "No categories found",
            emptyDescription: "Change the search or add a new category.",
            editItem: "Edit category",
            createItem: "Add category",
            slideSubtitle: "The code cannot be changed later.",
            deleteTitle: "Delete this category",
            deleteDescription: (name: string) => `${name} will be deleted. This is blocked while products still use the category.`,
            searchPlaceholder: "Search",
            columns: ["Code", "Name", "Status", ""],
            edit: "Edit",
            delete: "Delete",
            code: "Code",
            name: "Name",
            active: "Active",
            saving: "Saving",
            save: "Save",
            count: (n: number) => `${n} ${n === 1 ? "record" : "records"}`,
        };

    async function load() {
        const res = await apiFetch<ProductCategory[]>("/api/categories");
        if (res.success) {
            setItems(res.data);
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(
        () => items.filter((item) => [item.code, item.name].join(" ").toLowerCase().includes(query.toLowerCase())),
        [items, query]
    );

    const openCreate = () => {
        setDraft(initialDraft);
        setFormError(null);
        setSlideoverOpen(true);
    };

    const openEdit = (item: ProductCategory) => {
        setDraft(item);
        setFormError(null);
        setSlideoverOpen(true);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setFormError(null);

        const endpoint = draft.id ? `/api/categories/${draft.id}` : "/api/categories";
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
            load();
        } else {
            setFormError(res.error.message);
        }
    };

    const deleteItem = async () => {
        if (!deleteTarget) return;

        setSubmitting(true);
        setPageError(null);
        const res = await apiFetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
        setSubmitting(false);
        setDeleteTarget(null);

        if (res.success) {
            load();
        } else {
            setPageError(res.error.message);
        }
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="space-y-6">
                <PageHeader
                    title={text.title}
                    description={text.description}
                    actions={canEdit ? <button className="plms-button-primary" onClick={openCreate}>{text.newItem}</button> : null}
                />

                <FilterBar
                    left={<input className="plms-input max-w-sm" placeholder={text.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />}
                    right={loading ? null : <span className="tabular text-sm text-ink-3">{text.count(filtered.length)}</span>}
                />

                {pageError ? <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{pageError}</div> : null}

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <DataTable columns={text.columns}>
                        {filtered.map((item) => (
                            <tr key={item.id} className="transition-colors hover:bg-raised">
                                <td className="w-40 whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">{item.code}</td>
                                <td className="px-4 py-2.5 text-base text-ink">{item.name}</td>
                                <td className="px-4 py-2.5"><StatusBadge label={item.isActive ? "Active" : "Inactive"} tone={item.isActive ? "success" : "neutral"} /></td>
                                <td className="px-4 py-1.5">
                                    <div className="flex justify-end gap-1">
                                        {canEdit ? <button className="plms-button-compact" onClick={() => openEdit(item)}>{text.edit}</button> : null}
                                        {canDelete ? <button className="plms-button-compact hover:bg-bad-soft hover:text-bad" onClick={() => setDeleteTarget(item)}>{text.delete}</button> : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                <SlideOver
                    open={slideoverOpen}
                    title={draft.id ? text.editItem : text.createItem}
                    subtitle={text.slideSubtitle}
                    onClose={() => setSlideoverOpen(false)}
                >
                    <form className="space-y-5" onSubmit={submit}>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="registry-code" className="plms-label">{text.code}</label>
                            <input id="registry-code" className="plms-input font-mono" value={draft.code} disabled={Boolean(draft.id)} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="registry-name" className="plms-label">{text.name}</label>
                            <input id="registry-name" className="plms-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
                        </div>
                        <label className="flex items-center gap-3 text-sm text-ink">
                            <input type="checkbox" className="h-4 w-4 accent-accent" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                            {text.active}
                        </label>
                        {formError ? <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{formError}</div> : null}
                        <button className="plms-button-primary w-full" type="submit" disabled={submitting}>{submitting ? text.saving : draft.id ? text.save : text.createItem}</button>
                    </form>
                </SlideOver>

                <ConfirmModal
                    open={Boolean(deleteTarget)}
                    title={text.deleteTitle}
                    description={text.deleteDescription(deleteTarget?.name ?? "")}
                    confirmLabel={text.delete}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={deleteItem}
                    loading={submitting}
                />
            </div>
        </RoleGuard>
    );
}
