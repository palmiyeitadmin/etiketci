"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useText } from "@/lib/i18n";
import { LabelTemplate, TemplateComparison } from "@/types/template";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { TemplatePreviewCard } from "@/components/Templates/TemplatePreviewCard";

export default function TemplateComparePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const templateId = String(params.id);
    const leftVersionId = searchParams.get("leftVersionId") || "";
    const rightVersionId = searchParams.get("rightVersionId") || "";

    const [template, setTemplate] = useState<LabelTemplate | null>(null);
    const [comparison, setComparison] = useState<TemplateComparison | null>(null);
    const [loading, setLoading] = useState(true);

    const text = useText("templateDetail").compare;

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

    const leftVersion = comparison ? template?.versions?.find((version) => version.id === comparison.leftVersionId) : undefined;
    const rightVersion = comparison ? template?.versions?.find((version) => version.id === comparison.rightVersionId) : undefined;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="flex flex-col gap-6">
                <PageHeader
                    title={text.title}
                    description={template && comparison ? text.description(template.name, comparison.leftVersionNumber, comparison.rightVersionNumber) : text.descriptionFallback}
                    actions={template ? <Link href={`/templates/${template.id}`} className="plms-button-secondary">{text.back}</Link> : null}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
                ) : !comparison ? (
                    <EmptyState title={text.unavailableTitle} description={text.unavailableDescription} />
                ) : (
                    <>
                        {template && (leftVersion || rightVersion) ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {[leftVersion, rightVersion].map((version, index) => (
                                    <div key={version?.id ?? index} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="tabular font-mono text-sm text-ink">
                                                v{index === 0 ? comparison.leftVersionNumber : comparison.rightVersionNumber}
                                            </span>
                                            {version ? <StatusBadge label={version.status} tone={version.status === "Published" ? "success" : version.status === "InReview" ? "info" : "warning"} /> : null}
                                        </div>
                                        {version ? <TemplatePreviewCard template={template} version={version} /> : null}
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <section className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-md font-medium text-ink">{text.changes}</h2>
                                <p className="tabular flex gap-4 font-mono text-sm text-ink-3">
                                    <span>{text.added} {comparison.addedElements.length}</span>
                                    <span>{text.removed} {comparison.removedElements.length}</span>
                                    <span>{text.changed} {comparison.changedElements.length}</span>
                                </p>
                            </div>
                            {changes.length === 0 ? (
                                <EmptyState title={text.noChangesTitle} description={text.noChangesDescription} />
                            ) : (
                                <DataTable columns={[text.columns.change, text.columns.element, text.columns.id, text.columns.summary]}>
                                    {changes.map((change) => (
                                        <tr key={`${change.changeType}-${change.elementId}`}>
                                            <td className="whitespace-nowrap px-4 py-2.5">
                                                <StatusBadge
                                                    label={text.changeType[change.changeType] || change.changeType}
                                                    tone={change.changeType === "Added" ? "success" : change.changeType === "Removed" ? "danger" : "warning"}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-base text-ink">{text.elementType[change.elementType] || change.elementType}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-3">{change.elementId}</td>
                                            <td className="px-4 py-2.5 text-base text-ink-2">{change.summary}</td>
                                        </tr>
                                    ))}
                                </DataTable>
                            )}
                        </section>
                    </>
                )}
            </div>
        </RoleGuard>
    );
}
