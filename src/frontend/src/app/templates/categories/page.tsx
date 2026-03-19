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
            eyebrow: "Sablon kategori yonetimi",
            title: "Sablon Kategorileri",
            description: "Otomatik sablon kodu ureten kategori kayitlari ve kategori bazli sira yonetimi.",
            newCategory: "Yeni Kategori",
            searchPlaceholder: "Kategori kodu veya adinda ara",
            emptyTitle: "Sablon kategorisi bulunamadi",
            emptyDescription: "Yeni sablonlarin otomatik kod uretebilmesi icin kategori tanimlayin.",
            columns: ["Kod", "Ad", "Siradaki Kod", "Durum", "Aksiyonlar"],
            edit: "Duzenle",
            delete: "Sil",
            editCategory: "Kategoriyi Duzenle",
            createCategory: "Kategori Olustur",
            slideSubtitle: "Kategori kodlari sablon kodu uretiminde kullanilir ve olusturulduktan sonra degistirilemez.",
            code: "Kod",
            name: "Ad",
            active: "Aktif",
            saving: "Kaydediliyor...",
            updateCategory: "Kategoriyi Guncelle",
            deleteTitle: "Kategoriyi sil",
            deleteDescription: ` ${deleteTarget?.name ?? ""} kategorisini sil. Bu islem, sablonlar hala bu kategoriye bagliyse engellenir.`,
            deleteConfirm: "Kategoriyi Sil",
        }
        : {
            eyebrow: "Template category governance",
            title: "Template Categories",
            description: "Category records that drive automatic template code generation and category-based sequencing.",
            newCategory: "New Category",
            searchPlaceholder: "Search category code or name",
            emptyTitle: "No template categories found",
            emptyDescription: "Create template categories so new templates can generate governed codes.",
            columns: ["Code", "Name", "Next Code", "Status", "Actions"],
            edit: "Edit",
            delete: "Delete",
            editCategory: "Edit Category",
            createCategory: "Create Category",
            slideSubtitle: "Category codes are used in generated template codes and cannot be changed after creation.",
            code: "Code",
            name: "Name",
            active: "Active",
            saving: "Saving...",
            updateCategory: "Update Category",
            deleteTitle: "Delete category",
            deleteDescription: `Delete ${deleteTarget?.name ?? ""}. This is blocked if templates still reference the category.`,
            deleteConfirm: "Delete Category",
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
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow={text.eyebrow}
                    title={text.title}
                    description={text.description}
                    actions={canEdit ? <button className="plms-button-primary" onClick={openCreate}>{text.newCategory}</button> : null}
                />

                {message ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">{message}</div>
                ) : null}

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
                                <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{`PLM-${category.code}-${String(category.nextTemplateSequence).padStart(3, "0")}`}</td>
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
                            <input className="plms-input" value={draft.code} disabled={Boolean(draft.id)} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} required />
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
                    onConfirm={() => void deleteCategory()}
                    loading={submitting}
                />
            </div>
        </RoleGuard>
    );
}
