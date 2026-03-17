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

    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [draft, setDraft] = useState<CategoryDraft>(initialDraft);
    const [slideoverOpen, setSlideoverOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const text = locale === "tr"
        ? {
            eyebrow: "Kategori yonetimi",
            title: "Kategoriler",
            description: "Urun ana verisi ve ice aktarma dogrulamasi icin kullanilan kontrollu kategori kaydi.",
            newCategory: "Yeni Kategori",
            searchPlaceholder: "Kategori kodu veya adinda ara",
            emptyTitle: "Kategori bulunamadi",
            emptyDescription: "Urun yonetimi ve ice aktarma dogrulamasi icin kategoriler olusturun.",
            columns: ["Kod", "Ad", "Durum", "Aksiyonlar"],
            edit: "Duzenle",
            delete: "Sil",
            editCategory: "Kategoriyi Duzenle",
            createCategory: "Kategori Olustur",
            slideSubtitle: "Kategori kayitlari urunler, ice aktarmalar ve raporlama tarafinda kullanilir.",
            code: "Kod",
            name: "Ad",
            active: "Aktif",
            saving: "Kaydediliyor...",
            updateCategory: "Kategoriyi Guncelle",
            deleteTitle: "Kategoriyi sil",
            deleteDescription: ` ${deleteTarget?.name ?? ""} kategorisini sil. Bu islem, urunler hala bu kategoriye bagliyse engellenir.`,
            deleteConfirm: "Kategoriyi Sil",
        }
        : {
            eyebrow: "Category governance",
            title: "Categories",
            description: "Controlled product category registry used by product master data and import validation.",
            newCategory: "New Category",
            searchPlaceholder: "Search category code or name",
            emptyTitle: "No categories found",
            emptyDescription: "Create categories to support product governance and import validation.",
            columns: ["Code", "Name", "Status", "Actions"],
            edit: "Edit",
            delete: "Delete",
            editCategory: "Edit Category",
            createCategory: "Create Category",
            slideSubtitle: "Category records are used by products, imports and reporting.",
            code: "Code",
            name: "Name",
            active: "Active",
            saving: "Saving...",
            updateCategory: "Update Category",
            deleteTitle: "Delete category",
            deleteDescription: `Delete ${deleteTarget?.name ?? ""}. This is blocked if products still reference the category.`,
            deleteConfirm: "Delete Category",
        };

    async function load() {
        const res = await apiFetch<ProductCategory[]>("/api/categories");
        if (res.success) {
            setCategories(res.data);
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(
        () => categories.filter((category) => [category.code, category.name].join(" ").toLowerCase().includes(query.toLowerCase())),
        [categories, query]
    );

    const openCreate = () => {
        setDraft(initialDraft);
        setSlideoverOpen(true);
    };

    const openEdit = (category: ProductCategory) => {
        setDraft(category);
        setSlideoverOpen(true);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);

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
            alert(res.error.message);
        }
    };

    const deleteCategory = async () => {
        if (!deleteTarget) return;

        setSubmitting(true);
        const res = await apiFetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
        setSubmitting(false);

        if (res.success) {
            setDeleteTarget(null);
            load();
        } else {
            alert(res.error.message);
        }
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow={text.eyebrow}
                    title={text.title}
                    description={text.description}
                    actions={canEdit ? <button className="plms-button-primary" onClick={openCreate}>{text.newCategory}</button> : null}
                />

                <FilterBar left={<input className="plms-input max-w-xl" placeholder={text.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />} />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <DataTable columns={text.columns}>
                        {filtered.map((category) => (
                            <tr key={category.id} className="transition-colors hover:bg-white/5">
                                <td className="px-6 py-4"><span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{category.code}</span></td>
                                <td className="px-6 py-4 text-sm font-bold text-white">{category.name}</td>
                                <td className="px-6 py-4"><StatusBadge label={category.isActive ? "Active" : "Inactive"} tone={category.isActive ? "success" : "danger"} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-3">
                                        {canEdit ? <button className="text-xs font-black uppercase tracking-[0.22em] text-blue-300" onClick={() => openEdit(category)}>{text.edit}</button> : null}
                                        {canDelete ? <button className="text-xs font-black uppercase tracking-[0.22em] text-red-300" onClick={() => setDeleteTarget(category)}>{text.delete}</button> : null}
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
                    <form className="space-y-5" onSubmit={submit}>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.code}</label>
                            <input className="plms-input" value={draft.code} disabled={Boolean(draft.id)} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.name}</label>
                            <input className="plms-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
                        </div>
                        <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--plms-border)] px-4 py-3 text-sm font-medium text-white">
                            <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                            {text.active}
                        </label>
                        <button className="plms-button-primary w-full" type="submit" disabled={submitting}>{submitting ? text.saving : draft.id ? text.updateCategory : text.createCategory}</button>
                    </form>
                </SlideOver>

                <ConfirmModal
                    open={Boolean(deleteTarget)}
                    title={text.deleteTitle}
                    description={text.deleteDescription.trim()}
                    confirmLabel={text.deleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={deleteCategory}
                    loading={submitting}
                />
            </div>
        </RoleGuard>
    );
}
