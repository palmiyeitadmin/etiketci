"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { LabelTemplate, TemplateRestorationRequest, TemplateVersion } from "@/types/template";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";

export default function ArchivedTemplatesPage() {
    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<{ template: LabelTemplate; version: TemplateVersion } | null>(null);
    const [form, setForm] = useState({ businessJustification: "", targetEnvironment: "", requestedUntil: "" });
    const [submitting, setSubmitting] = useState(false);

    async function load() {
        const res = await apiFetch<LabelTemplate[]>("/api/Templates/archived");
        if (res.success) {
            setTemplates(res.data.map(normalizeLabelTemplate));
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected) return;

        setSubmitting(true);
        const res = await apiFetch<TemplateRestorationRequest>(`/api/Templates/${selected.template.id}/versions/${selected.version.id}/restore-request`, {
            method: "POST",
            body: JSON.stringify({
                businessJustification: form.businessJustification,
                targetEnvironment: form.targetEnvironment || undefined,
                requestedUntil: form.requestedUntil || undefined,
            }),
        });
        setSubmitting(false);

        if (res.success) {
            setSelected(null);
            setForm({ businessJustification: "", targetEnvironment: "", requestedUntil: "" });
            alert("Restoration request submitted.");
            return;
        }

        alert(res.error.message);
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow="Template archive"
                    title="Archived Templates"
                    description="Historical template versions retained for governance, audit and recovery workflows."
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : templates.length === 0 ? (
                    <EmptyState title="Archive is empty" description="There are no archived or deprecated versions available yet." />
                ) : (
                    <DataTable columns={["Code", "Template", "Archived Versions", "Actions"]}>
                        {templates.map((template) => (
                            <tr key={template.id} className="transition-colors hover:bg-white/5">
                                <td className="px-6 py-4"><span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{template.code}</span></td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-white">{template.name}</div>
                                    <div className="mt-1 text-xs text-[color:var(--plms-text-subtle)]">{template.description || "No description"}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-2">
                                        {(template.versions || []).map((version) => (
                                            <div key={version.id} className="flex flex-wrap items-center gap-2">
                                                <StatusBadge label={`v${version.versionNumber} ${version.status}`} tone={version.status === "Archived" ? "danger" : "warning"} />
                                                <button className="text-xs font-black uppercase tracking-[0.22em] text-blue-300" onClick={() => setSelected({ template, version })}>
                                                    Request Restore
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/templates/${template.id}`} className="text-xs font-black uppercase tracking-[0.22em] text-blue-300 hover:text-blue-200">
                                        Open Detail
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                <SlideOver
                    open={Boolean(selected)}
                    title="Request Restoration"
                    subtitle={selected ? `${selected.template.code} v${selected.version.versionNumber}` : undefined}
                    onClose={() => setSelected(null)}
                >
                    <form className="space-y-5" onSubmit={submit}>
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">
                            Restoring archived templates is an auditable action. Approval from a reviewer is required before a new draft is created.
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Business Justification</label>
                            <textarea className="plms-input min-h-32" value={form.businessJustification} onChange={(e) => setForm({ ...form, businessJustification: e.target.value })} required />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Target Environment</label>
                            <input className="plms-input" value={form.targetEnvironment} onChange={(e) => setForm({ ...form, targetEnvironment: e.target.value })} placeholder="Production, staging, sandbox..." />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Requested Until</label>
                            <input className="plms-input" type="date" value={form.requestedUntil} onChange={(e) => setForm({ ...form, requestedUntil: e.target.value })} />
                        </div>
                        <button className="plms-button-primary w-full" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Restoration Request"}</button>
                    </form>
                </SlideOver>
            </div>
        </RoleGuard>
    );
}
