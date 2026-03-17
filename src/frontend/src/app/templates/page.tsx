"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { ensureEditableVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
import { TemplatePreviewCard } from "@/components/Templates/TemplatePreviewCard";

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
    const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const res = await apiFetch<LabelTemplate[]>("/api/Templates");
            if (res.success) {
                setTemplates(res.data.map(normalizeLabelTemplate));
            }
            setLoading(false);
        }

        void load();
    }, []);

    const filteredTemplates = useMemo(
        () =>
            templates.filter((template) =>
                [template.code, template.name, template.description ?? ""].join(" ").toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [templates, searchTerm]
    );

    const previewVersion: TemplateVersion | undefined = selectedTemplate?.currentActiveVersion || selectedTemplate?.latestVersion || selectedTemplate?.versions?.[0];

    async function handleOpenEditor(templateId: string) {
        setOpeningTemplateId(templateId);
        try {
            const res = await apiFetch<LabelTemplate>(`/api/Templates/${templateId}`);
            if (!res.success) {
                return;
            }

            const normalizedTemplate = normalizeLabelTemplate(res.data);
            const draft = await ensureEditableVersion(normalizedTemplate);
            router.push(`/templates/${templateId}/edit?versionId=${draft.id}`);
        } finally {
            setOpeningTemplateId(null);
        }
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow="Template lifecycle"
                    title="Templates"
                    description="Canonical label models, governed revisions and published production-ready versions."
                    actions={
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <Link href="/templates/new" className="plms-button-primary">
                                New Template
                            </Link>
                        </RoleGuard>
                    }
                />

                <FilterBar
                    left={
                        <input
                            className="plms-input max-w-xl"
                            placeholder="Search by template code, name or description"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    }
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <EmptyState
                        title="No templates available"
                        description="Create a new canonical template or adjust the active filter."
                    />
                ) : (
                    <DataTable columns={["Code", "Template", "Active Version", "Lifecycle", "Updated", "Open"]}>
                        {filteredTemplates.map((template) => {
                            const status = template.currentActiveVersion ? "Published" : template.inReviewCount ? "In Review" : "Draft only";
                            return (
                                <tr key={template.id} className="cursor-pointer transition-colors hover:bg-white/5" onClick={() => setSelectedTemplate(template)}>
                                    <td className="px-6 py-4">
                                        <span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">
                                            {template.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-white">{template.name}</div>
                                        <div className="mt-1 text-xs text-[color:var(--plms-text-subtle)]">
                                            {template.description || "No description"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
                                        {template.currentActiveVersion ? `v${template.currentActiveVersion.versionNumber}` : "-"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge label={status} tone={template.currentActiveVersion ? "success" : template.inReviewCount ? "info" : "warning"} />
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                                        {new Date(template.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link href={`/templates/${template.id}`} className="text-xs font-black uppercase tracking-[0.22em] text-blue-300 hover:text-blue-200" onClick={(event) => event.stopPropagation()}>
                                            Open
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </DataTable>
                )}
            </div>

            <SlideOver
                open={selectedTemplate !== null}
                title={selectedTemplate?.name || "Template"}
                subtitle={selectedTemplate ? `${selectedTemplate.code} · ${selectedTemplate.lastUpdatedBy || "Unknown updater"}` : undefined}
                onClose={() => setSelectedTemplate(null)}
            >
                {selectedTemplate ? (
                    <div className="space-y-6">
                        <TemplatePreviewCard template={selectedTemplate} version={previewVersion} />

                        <section className="grid gap-4 md:grid-cols-2">
                            <DetailMetric label="Active version" value={selectedTemplate.currentActiveVersion ? `v${selectedTemplate.currentActiveVersion.versionNumber}` : "None"} />
                            <DetailMetric label="Latest version" value={selectedTemplate.latestVersion ? `v${selectedTemplate.latestVersion.versionNumber}` : "None"} />
                            <DetailMetric label="Linked products" value={String(selectedTemplate.linkedProductCount ?? 0)} />
                            <DetailMetric label="Published count" value={String(selectedTemplate.publishedCount ?? 0)} />
                            <DetailMetric label="Drafts" value={String(selectedTemplate.draftCount ?? 0)} />
                            <DetailMetric label="In review" value={String(selectedTemplate.inReviewCount ?? 0)} />
                        </section>

                        <section className="rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Lifecycle Snapshot</div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <StatusBadge label={selectedTemplate.currentActiveVersion ? "Published" : selectedTemplate.inReviewCount ? "In Review" : "Draft only"} tone={selectedTemplate.currentActiveVersion ? "success" : selectedTemplate.inReviewCount ? "info" : "warning"} />
                                {selectedTemplate.latestVersion ? <StatusBadge label={`Latest ${selectedTemplate.latestVersion.status}`} tone="neutral" /> : null}
                            </div>
                            <div className="mt-4 text-sm text-[color:var(--plms-text-subtle)]">{selectedTemplate.description || "No template description was provided for this label model."}</div>
                        </section>

                        <section className="rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Quick Actions</div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                <Link href={`/templates/${selectedTemplate.id}`} className="plms-button-compact">Open Detail</Link>
                                <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                    <button type="button" className="plms-button-compact" onClick={() => void handleOpenEditor(selectedTemplate.id)} disabled={openingTemplateId === selectedTemplate.id}>
                                        {openingTemplateId === selectedTemplate.id ? "Opening..." : "Open Editor"}
                                    </button>
                                </RoleGuard>
                                {previewVersion ? <Link href={`/templates/${selectedTemplate.id}/preview?versionId=${previewVersion.id}`} className="plms-button-compact">Preview PDF</Link> : null}
                            </div>
                        </section>
                    </div>
                ) : null}
            </SlideOver>
        </RoleGuard>
    );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{label}</div>
            <div className="mt-2 text-xl font-black tracking-[-0.04em] text-white">{value}</div>
        </div>
    );
}
