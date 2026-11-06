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

    const [notice, setNotice] = useState<{ text: string; tone: "good" | "bad" } | null>(null);

    const text = locale === "tr"
        ? {
            title: "Arşivlenmiş şablonlar",
            description: "Arşive kaldırılan şablonlar ve sürümler. Buradan geri yükleme talebi açabilirsiniz.",
            emptyTitle: "Arşiv boş",
            emptyDescription: "Henüz arşivlenmiş veya geçersiz sürüm yok.",
            columns: ["Şablon", "Kod", "Şablon durumu", "Arşivdeki sürümler", "\u00a0"],
            noDescription: "Açıklama yok",
            requestRestore: "Geri yükleme iste",
            restoreTemplate: "Şablonu geri al",
            restoring: "Geri alınıyor",
            archivedTemplate: "Arşivde",
            notArchived: "Listede",
            requestRestoration: "Geri yükleme talebi",
            restoreWarning: "Geri yükleme kayda geçer. Yeni taslak oluşmadan önce bir inceleyicinin onayı gerekir.",
            businessJustification: "Gerekçe",
            targetEnvironment: "Hedef ortam",
            targetEnvironmentPlaceholder: "Üretim veya test",
            requestedUntil: "Geçerlilik tarihi",
            submitting: "Gönderiliyor",
            submitRequest: "Talebi gönder",
            success: "Geri yükleme talebi gönderildi",
        }
        : {
            title: "Archived templates",
            description: "Templates and versions moved to the archive. Request a restore from here.",
            emptyTitle: "Archive is empty",
            emptyDescription: "There are no archived or deprecated versions yet.",
            columns: ["Template", "Code", "Template state", "Archived versions", "\u00a0"],
            noDescription: "No description",
            requestRestore: "Request restore",
            restoreTemplate: "Restore template",
            restoring: "Restoring",
            archivedTemplate: "Archived",
            notArchived: "In list",
            requestRestoration: "Restore request",
            restoreWarning: "Restores are recorded. A reviewer has to approve before a new draft is created.",
            businessJustification: "Reason",
            targetEnvironment: "Target environment",
            targetEnvironmentPlaceholder: "Production or test",
            requestedUntil: "Valid until",
            submitting: "Submitting",
            submitRequest: "Submit request",
            success: "Restore request submitted",
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

        setNotice({ text: res.error.message, tone: "bad" });
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
            setNotice({ text: text.success, tone: "good" });
            return;
        }

        setNotice({ text: res.error.message, tone: "bad" });
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="flex flex-col gap-6">
                <PageHeader title={text.title} description={text.description} />

                {notice ? (
                    <div role="status" className={`rounded-lg px-3 py-2 text-sm ${notice.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{notice.text}</div>
                ) : null}

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
                ) : templates.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <DataTable columns={text.columns}>
                        {templates.map((template) => (
                            <tr key={template.id} className="align-top transition-colors hover:bg-raised">
                                <td className="min-w-56 px-4 py-2.5">
                                    <Link href={`/templates/${template.id}`} className="text-base font-medium text-ink hover:text-accent">{template.name}</Link>
                                    <div className="max-w-md truncate text-sm text-ink-3">{template.description || text.noDescription}</div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">{template.code}</td>
                                <td className="whitespace-nowrap px-4 py-2.5">
                                    {template.isArchived
                                        ? <StatusBadge label={text.archivedTemplate} tone="danger" />
                                        : <span className="text-sm text-ink-3">{text.notArchived}</span>}
                                </td>
                                <td className="px-4 py-2.5">
                                    <ul className="flex flex-col gap-1">
                                        {(template.versions || []).map((version) => (
                                            <li key={version.id} className="flex items-center gap-3">
                                                <span className="tabular w-8 font-mono text-sm text-ink">v{version.versionNumber}</span>
                                                <StatusBadge label={version.status} tone={version.status === "Archived" ? "danger" : "warning"} />
                                                <button type="button" className="text-sm font-medium text-accent hover:text-accent-hover" onClick={() => setSelected({ template, version })}>
                                                    {text.requestRestore}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="w-px whitespace-nowrap px-4 py-2.5 text-right">
                                    {template.isArchived && canRestoreMaster ? (
                                        <button type="button" className="plms-button-compact" onClick={() => void restoreTemplate(template.id)} disabled={restoringTemplateId === template.id}>
                                            {restoringTemplateId === template.id ? text.restoring : text.restoreTemplate}
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                <SlideOver
                    open={Boolean(selected)}
                    title={text.requestRestoration}
                    subtitle={selected ? `${selected.template.code} · v${selected.version.versionNumber}` : undefined}
                    onClose={() => setSelected(null)}
                >
                    <form className="flex flex-col gap-5" onSubmit={submit}>
                        <p className="text-sm text-ink-2">{text.restoreWarning}</p>
                        <label className="flex flex-col gap-1.5">
                            <span className="plms-label">{text.businessJustification}</span>
                            <textarea className="plms-input min-h-32" value={form.businessJustification} onChange={(e) => setForm({ ...form, businessJustification: e.target.value })} required />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="plms-label">{text.targetEnvironment}</span>
                            <input className="plms-input" value={form.targetEnvironment} onChange={(e) => setForm({ ...form, targetEnvironment: e.target.value })} placeholder={text.targetEnvironmentPlaceholder} />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="plms-label">{text.requestedUntil}</span>
                            <input className="plms-input" type="date" value={form.requestedUntil} onChange={(e) => setForm({ ...form, requestedUntil: e.target.value })} />
                        </label>
                        <button className="plms-button-primary self-start" type="submit" disabled={submitting}>{submitting ? text.submitting : text.submitRequest}</button>
                    </form>
                </SlideOver>
            </div>
        </RoleGuard>
    );
}
