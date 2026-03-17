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

type CategoryDraft = { id?: string; code: string; name: string; isActive: boolean };

const initialDraft: CategoryDraft = { code: "", name: "", isActive: true };

export default function CategoriesPage() {
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
                    eyebrow="Category governance"
                    title="Categories"
                    description="Controlled product category registry used by product master data and import validation."
                    actions={canEdit ? <button className="plms-button-primary" onClick={openCreate}>New Category</button> : null}
                />

                <FilterBar left={<input className="plms-input max-w-xl" placeholder="Search category code or name" value={query} onChange={(e) => setQuery(e.target.value)} />} />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState title="No categories found" description="Create categories to support product governance and import validation." />
                ) : (
                    <DataTable columns={["Code", "Name", "Status", "Actions"]}>
                        {filtered.map((category) => (
                            <tr key={category.id} className="transition-colors hover:bg-white/5">
                                <td className="px-6 py-4"><span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{category.code}</span></td>
                                <td className="px-6 py-4 text-sm font-bold text-white">{category.name}</td>
                                <td className="px-6 py-4"><StatusBadge label={category.isActive ? "Active" : "Inactive"} tone={category.isActive ? "success" : "danger"} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-3">
                                        {canEdit ? <button className="text-xs font-black uppercase tracking-[0.22em] text-blue-300" onClick={() => openEdit(category)}>Edit</button> : null}
                                        {canDelete ? <button className="text-xs font-black uppercase tracking-[0.22em] text-red-300" onClick={() => setDeleteTarget(category)}>Delete</button> : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                <SlideOver
                    open={slideoverOpen}
                    title={draft.id ? "Edit Category" : "Create Category"}
                    subtitle="Category records are used by products, imports and reporting."
                    onClose={() => setSlideoverOpen(false)}
                >
                    <form className="space-y-5" onSubmit={submit}>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Code</label>
                            <input className="plms-input" value={draft.code} disabled={Boolean(draft.id)} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Name</label>
                            <input className="plms-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
                        </div>
                        <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--plms-border)] px-4 py-3 text-sm font-medium text-white">
                            <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                            Active
                        </label>
                        <button className="plms-button-primary w-full" type="submit" disabled={submitting}>{submitting ? "Saving..." : draft.id ? "Update Category" : "Create Category"}</button>
                    </form>
                </SlideOver>

                <ConfirmModal
                    open={Boolean(deleteTarget)}
                    title="Delete category"
                    description={`Delete ${deleteTarget?.name}. This is blocked if products still reference the category.`}
                    confirmLabel="Delete Category"
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={deleteCategory}
                    loading={submitting}
                />
            </div>
        </RoleGuard>
    );
}
