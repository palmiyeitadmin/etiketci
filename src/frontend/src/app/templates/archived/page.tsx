"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { LabelTemplate, TemplateRestorationRequest, TemplateVersion } from "@/types/template";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { useI18n } from "@/lib/i18n";

export default function ArchivedTemplatesPage() {
    const { locale } = useI18n();
    const { data: session } = useSession();
    const roles = ((session?.user as any)?.roles || []) as string[];
    const grantedPermissions = ((session?.user as any)?.permissions || []) as string[];
    const canRestoreMaster = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesArchive]);
    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<{ template: LabelTemplate; version: TemplateVersion } | null>(null);
    const [restoringTemplateId, setRestoringTemplateId] = useState<string | null>(null);
    const [form, setForm] = useState({ businessJustification: "", targetEnvironment: "", requestedUntil: "" });
    const [submitting, setSubmitting] = useState(false);

    const text = locale === "tr"
        ? {
            eyebrow: "Şablon arşivi",
            title: "Arşivlenmiş Şablonlar",
            description: "Arşive kaldırılan şablonlar ve sürümler. Buradan geri yükleme talebi açabilirsiniz.",
            emptyTitle: "Arşiv boş",
            emptyDescription: "Henüz arşivlenmiş veya kullanımı kaldırılmış sürüm yok.",
            columns: ["Kod", "Şablon", "Arşiv", "Arşivlenmiş Sürümler", "Aksiyonlar"],
            noDescription: "Açıklama yok",
            requestRestore: "Geri Yükleme Talep Et",
            openDetail: "Detayı Aç",
            restoreTemplate: "Şablonu Geri Al",
            archivedTemplate: "Arşivli Şablon",
            archivedVersion: "Arşivli Sürüm",
            deprecatedVersion: "Kullanımı Kaldırılmış Sürüm",
            requestRestoration: "Geri Yükleme Talebi",
            restoreWarning: "Arşivlenmiş şablonları geri yüklemek denetlenebilir bir işlemdir. Yeni bir taslak oluşmadan önce reviewer onayı gerekir.",
            businessJustification: "İş Gerekçesi",
            targetEnvironment: "Hedef Ortam",
            targetEnvironmentPlaceholder: "Üretim, staging, sandbox...",
            requestedUntil: "Geçerlilik Tarihi",
            submitting: "Gönderiliyor...",
            submitRequest: "Geri Yükleme Talebini Gönder",
            success: "Geri yükleme talebi gönderildi.",
        }
        : {
            eyebrow: "Template archive",
            title: "Archived Templates",
            description: "Historical template versions retained for governance, audit and recovery workflows.",
            emptyTitle: "Archive is empty",
            emptyDescription: "There are no archived or deprecated versions available yet.",
            columns: ["Code", "Template", "Master Archive", "Archived Versions", "Actions"],
            noDescription: "No description",
            requestRestore: "Request Restore",
            openDetail: "Open Detail",
            restoreTemplate: "Restore Template",
            archivedTemplate: "Archived Template",
            archivedVersion: "Archived Version",
            deprecatedVersion: "Deprecated Version",
            requestRestoration: "Request Restoration",
            restoreWarning: "Restoring archived templates is an auditable action. Approval from a reviewer is required before a new draft is created.",
            businessJustification: "Business Justification",
            targetEnvironment: "Target Environment",
            targetEnvironmentPlaceholder: "Production, staging, sandbox...",
            requestedUntil: "Requested Until",
            submitting: "Submitting...",
            submitRequest: "Submit Restoration Request",
            success: "Restoration request submitted.",
        };

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

    const restoreTemplate = async (templateId: string) => {
        setRestoringTemplateId(templateId);
        const res = await apiFetch(`/api/Templates/${templateId}/restore`, { method: "POST" });
        setRestoringTemplateId(null);
        if (res.success) {
            await load();
            return;
        }

        alert(res.error.message);
    };

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
            alert(text.success);
            return;
        }

        alert(res.error.message);
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow={text.eyebrow}
                    title={text.title}
                    description={text.description}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>
                ) : templates.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <DataTable columns={text.columns}>
                        {templates.map((template) => (
                            <tr key={template.id} className="transition-colors hover:bg-white/5">
                                <td className="px-6 py-4"><span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">{template.code}</span></td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-ink">{template.name}</div>
                                    <div className="mt-1 text-xs text-ink-3">{template.description || text.noDescription}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {template.isArchived ? (
                                        <div className="space-y-2">
                                            <StatusBadge label={text.archivedTemplate} tone="danger" />
                                            {canRestoreMaster ? (
                                                <button className="text-xs font-medium text-accent" onClick={() => void restoreTemplate(template.id)} disabled={restoringTemplateId === template.id}>
                                                    {restoringTemplateId === template.id ? "..." : text.restoreTemplate}
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <span className="text-xs font-medium text-ink-3">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-2">
                                        {(template.versions || []).map((version) => (
                                            <div key={version.id} className="flex flex-wrap items-center gap-2">
                                                <StatusBadge label={version.status === "Archived" ? `${text.archivedVersion} v${version.versionNumber}` : `${text.deprecatedVersion} v${version.versionNumber}`} tone={version.status === "Archived" ? "danger" : "warning"} />
                                                <button className="text-xs font-medium text-accent" onClick={() => setSelected({ template, version })}>
                                                    {text.requestRestore}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/templates/${template.id}`} className="text-xs font-medium text-accent hover:text-accent">
                                        {text.openDetail}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                <SlideOver
                    open={Boolean(selected)}
                    title={text.requestRestoration}
                    subtitle={selected ? `${selected.template.code} v${selected.version.versionNumber}` : undefined}
                    onClose={() => setSelected(null)}
                >
                    <form className="space-y-5" onSubmit={submit}>
                        <div className="rounded-lg border border-warn/20 bg-warn/10 p-4 text-sm font-medium text-warn">
                            {text.restoreWarning}
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-medium text-ink-3">{text.businessJustification}</label>
                            <textarea className="plms-input min-h-32" value={form.businessJustification} onChange={(e) => setForm({ ...form, businessJustification: e.target.value })} required />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-medium text-ink-3">{text.targetEnvironment}</label>
                            <input className="plms-input" value={form.targetEnvironment} onChange={(e) => setForm({ ...form, targetEnvironment: e.target.value })} placeholder={text.targetEnvironmentPlaceholder} />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-medium text-ink-3">{text.requestedUntil}</label>
                            <input className="plms-input" type="date" value={form.requestedUntil} onChange={(e) => setForm({ ...form, requestedUntil: e.target.value })} />
                        </div>
                        <button className="plms-button-primary w-full" type="submit" disabled={submitting}>{submitting ? text.submitting : text.submitRequest}</button>
                    </form>
                </SlideOver>
            </div>
        </RoleGuard>
    );
}
