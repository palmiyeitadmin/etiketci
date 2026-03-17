"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { LabelTemplate, TemplateComparison } from "@/types/template";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TemplateComparePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const templateId = String(params.id);
    const leftVersionId = searchParams.get("leftVersionId") || "";
    const rightVersionId = searchParams.get("rightVersionId") || "";

    const [template, setTemplate] = useState<LabelTemplate | null>(null);
    const [comparison, setComparison] = useState<TemplateComparison | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const templateRes = await apiFetch<LabelTemplate>(`/api/Templates/${templateId}`);
            if (templateRes.success) {
                const normalized = normalizeLabelTemplate(templateRes.data);
                setTemplate(normalized);

                const defaultLeft = leftVersionId || normalized.versions?.[0]?.id || "";
                const defaultRight = rightVersionId || normalized.versions?.[1]?.id || normalized.versions?.[0]?.id || "";

                if (defaultLeft && defaultRight) {
                    const compareRes = await apiFetch<TemplateComparison>(`/api/Templates/${templateId}/versions/${defaultLeft}/compare?againstVersionId=${defaultRight}`);
                    if (compareRes.success) {
                        setComparison(compareRes.data);
                    }
                }
            }
            setLoading(false);
        }

        load();
    }, [templateId, leftVersionId, rightVersionId]);

    const changes = useMemo(() => {
        if (!comparison) return [];
        return [
            ...comparison.addedElements,
            ...comparison.removedElements,
            ...comparison.changedElements,
        ];
    }, [comparison]);

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="mx-auto max-w-6xl space-y-6">
                <PageHeader
                    eyebrow="Template governance"
                    title="Version Comparison"
                    description="Structural diff across canonical label elements for audit-ready version review."
                    actions={template ? <Link href={`/templates/${template.id}`} className="plms-button-secondary">Back to Template</Link> : null}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : !comparison ? (
                    <EmptyState title="Comparison unavailable" description="Select two template versions to generate a structural diff." />
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Left Version</div>
                                <div className="mt-3 text-2xl font-black text-white">v{comparison.leftVersionNumber}</div>
                            </div>
                            <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Right Version</div>
                                <div className="mt-3 text-2xl font-black text-white">v{comparison.rightVersionNumber}</div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                            <div className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-white">Element Changes</div>
                            <div className="space-y-3">
                                {changes.length === 0 ? (
                                    <EmptyState title="No changes detected" description="These versions are structurally identical at the element level." />
                                ) : (
                                    changes.map((change) => (
                                        <div key={`${change.changeType}-${change.elementId}`} className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <StatusBadge label={change.changeType} tone={change.changeType === "Added" ? "success" : change.changeType === "Removed" ? "danger" : "warning"} />
                                                <span className="text-sm font-bold text-white">{change.elementType}</span>
                                                <span className="font-mono text-xs text-[color:var(--plms-text-subtle)]">{change.elementId}</span>
                                            </div>
                                            <p className="mt-3 text-sm font-medium text-[color:var(--plms-text-muted)]">{change.summary}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
