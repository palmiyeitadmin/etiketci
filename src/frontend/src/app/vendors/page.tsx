"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { Vendor } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type VendorDraft = { id?: string; code: string; name: string; isActive: boolean };

const initialDraft: VendorDraft = { code: "", name: "", isActive: true };

export default function VendorsPage() {
    const { data: session } = useSession();
    const roles = ((session?.user as any)?.roles || []) as string[];
    const grantedPermissions = ((session?.user as any)?.permissions || []) as string[];
    const canEdit = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.vendorsManage]);
    const canDelete = roles.includes("Admin");

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [draft, setDraft] = useState<VendorDraft>(initialDraft);
    const [slideoverOpen, setSlideoverOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function load() {
        const res = await apiFetch<Vendor[]>("/api/Vendors");
        if (res.success) {
            setVendors(res.data);
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(
        () => vendors.filter((vendor) => [vendor.code, vendor.name].join(" ").toLowerCase().includes(query.toLowerCase())),
        [vendors, query]
    );

    const openCreate = () => {
        setDraft(initialDraft);
        setSlideoverOpen(true);
    };

    const openEdit = (vendor: Vendor) => {
        setDraft(vendor);
        setSlideoverOpen(true);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);

        const endpoint = draft.id ? `/api/Vendors/${draft.id}` : "/api/Vendors";
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

    const deleteVendor = async () => {
        if (!deleteTarget) return;

        setSubmitting(true);
        const res = await apiFetch(`/api/Vendors/${deleteTarget.id}`, { method: "DELETE" });
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
                    eyebrow="Vendor operations"
                    title="Vendors"
                    description="Vendor registry for product sourcing, import validation and downstream label context."
                    actions={canEdit ? <button className="plms-button-primary" onClick={openCreate}>New Vendor</button> : null}
                />

                <FilterBar left={<input className="plms-input max-w-xl" placeholder="Search vendor code or name" value={query} onChange={(e) => setQuery(e.target.value)} />} />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState title="No vendors found" description="Create a vendor entry to support product and import workflows." />
                ) : (
                    <DataTable columns={["Code", "Name", "Status", "Actions"]}>
                        {filtered.map((vendor) => (
                            <tr key={vendor.id} className="transition-colors hover:bg-white/5">
                                <td className="px-6 py-4"><span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{vendor.code}</span></td>
                                <td className="px-6 py-4 text-sm font-bold text-white">{vendor.name}</td>
                                <td className="px-6 py-4"><StatusBadge label={vendor.isActive ? "Active" : "Inactive"} tone={vendor.isActive ? "success" : "danger"} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-3">
                                        {canEdit ? <button className="text-xs font-black uppercase tracking-[0.22em] text-blue-300" onClick={() => openEdit(vendor)}>Edit</button> : null}
                                        {canDelete ? <button className="text-xs font-black uppercase tracking-[0.22em] text-red-300" onClick={() => setDeleteTarget(vendor)}>Delete</button> : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                <SlideOver
                    open={slideoverOpen}
                    title={draft.id ? "Edit Vendor" : "Create Vendor"}
                    subtitle="Vendor records feed product governance and CSV validation."
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
                        <button className="plms-button-primary w-full" type="submit" disabled={submitting}>{submitting ? "Saving..." : draft.id ? "Update Vendor" : "Create Vendor"}</button>
                    </form>
                </SlideOver>

                <ConfirmModal
                    open={Boolean(deleteTarget)}
                    title="Delete vendor"
                    description={`Delete ${deleteTarget?.name}. This is blocked if products still reference the vendor.`}
                    confirmLabel="Delete Vendor"
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={deleteVendor}
                    loading={submitting}
                />
            </div>
        </RoleGuard>
    );
}
