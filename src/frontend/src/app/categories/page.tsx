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
            eyebrow: "Kategori yönetimi",
            title: "Kategoriler",
            description: "Ürün ana verisi ve içe aktarma doğrulaması için kullanılan kontrollü kategori kaydı.",
            newCategory: "Yeni Kategori",
            searchPlaceholder: "Kategori kodu veya adında ara",
            emptyTitle: "Kategori bulunamadı",
            emptyDescription: "Ürün yönetimi ve içe aktarma doğrulaması için kategoriler oluşturun.",
            columns: ["Kod", "Ad", "Durum", "Aksiyonlar"],
            edit: "Düzenle",
            delete: "Sil",
            editCategory: "Kategoriyi Düzenle",
            createCategory: "Kategori Oluştur",
            slideSubtitle: "Kategori kayıtları ürünler, içe aktarmalar ve raporlama tarafında kullanılır.",
            code: "Kod",
            name: "Ad",
            active: "Aktif",
            saving: "Kaydediliyor...",
            updateCategory: "Kategoriyi Güncelle",
            deleteTitle: "Kategoriyi sil",
            deleteDescription: ` ${deleteTarget?.name ?? ""} kategorisini sil. Bu işlem, ürünler hâlâ bu kategoriye bağlıysa engellenir.`,
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
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <DataTable columns={text.columns}>
                        {filtered.map((category) => (
                            <tr key={category.id} className="transition-colors hover:bg-white/5">
                                <td className="px-6 py-4"><span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">{category.code}</span></td>
                                <td className="px-6 py-4 text-sm font-medium text-ink">{category.name}</td>
                                <td className="px-6 py-4"><StatusBadge label={category.isActive ? "Active" : "Inactive"} tone={category.isActive ? "success" : "danger"} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-3">
                                        {canEdit ? <button className="text-xs font-medium text-accent" onClick={() => openEdit(category)}>{text.edit}</button> : null}
                                        {canDelete ? <button className="text-xs font-medium text-bad" onClick={() => setDeleteTarget(category)}>{text.delete}</button> : null}
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
                            <label className="mb-2 block text-xs font-medium text-ink-3">{text.code}</label>
                            <input className="plms-input" value={draft.code} disabled={Boolean(draft.id)} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-medium text-ink-3">{text.name}</label>
                            <input className="plms-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
                        </div>
                        <label className="flex items-center gap-3 rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink">
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
