"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TemplateRestorationRequest } from "@/types/template";

interface ApprovalSummary {
    templateId: string;
    templateName: string;
    templateCode: string;
    versionId: string;
    versionNumber: number;
    requestedAt: string;
    requestedBy: string;
    changeNotes?: string;
    reviewCommentSummary?: string;
}

export default function ApprovalQueuePage() {
    const { formatDateTime, t } = useI18n();
    const [approvals, setApprovals] = useState<ApprovalSummary[]>([]);
    const [restorations, setRestorations] = useState<TemplateRestorationRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const [approvalRes, restorationRes] = await Promise.all([
                apiFetch<ApprovalSummary[]>("/api/Templates/approvals"),
                apiFetch<TemplateRestorationRequest[]>("/api/Templates/restoration-approvals"),
            ]);

            if (approvalRes.success) {
                setApprovals(approvalRes.data);
            }

            if (restorationRes.success) {
                setRestorations(restorationRes.data);
            }

            setLoading(false);
        }

        load();
    }, []);

    return (
        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
            <div className="mx-auto max-w-6xl space-y-6">
                <PageHeader
                    eyebrow={t("approvals.eyebrow")}
                    title={t("approvals.title")}
                    description={t("approvals.description")}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" />
                    </div>
                ) : approvals.length === 0 && restorations.length === 0 ? (
                    <EmptyState
                        title={t("approvals.emptyTitle")}
                        description={t("approvals.emptyDescription")}
                    />
                ) : (
                    <div className="space-y-8">
                        <section className="space-y-4">
                            <div className="text-sm font-medium text-ink">{t("approvals.templateReviews")}</div>
                            {approvals.length === 0 ? (
                                <EmptyState title={t("approvals.noTemplateReviews")} description={t("approvals.noTemplateReviewsDescription")} />
                            ) : approvals.map((item) => (
                                <div
                                    key={item.versionId}
                                    className="rounded-xl border border-line bg-surface p-6"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">
                                                    {item.templateCode}
                                                </span>
                                                <StatusBadge label={`v${item.versionNumber}`} tone="warning" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-medium text-ink">{item.templateName}</h2>
                                                <div className="mt-1 text-xs font-medium text-ink-3">
                                                    {t("approvals.requestedByOn", undefined, { user: item.requestedBy, date: formatDateTime(item.requestedAt) })}
                                                </div>
                                            </div>
                                            {item.reviewCommentSummary || item.changeNotes ? (
                                                <p className="max-w-3xl text-sm font-medium text-ink-2">{item.reviewCommentSummary || item.changeNotes}</p>
                                            ) : null}
                                        </div>
                                        <Link href={`/approvals/templates/${item.versionId}`} className="plms-button-primary">
                                            {t("approvals.openReview")}
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className="space-y-4">
                            <div className="text-sm font-medium text-ink">{t("approvals.restorationRequests")}</div>
                            {restorations.length === 0 ? (
                                <EmptyState title={t("approvals.noRestorationRequests")} description={t("approvals.noRestorationRequestsDescription")} />
                            ) : restorations.map((item) => (
                                <div key={item.id} className="rounded-xl border border-line bg-surface p-6">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">{item.templateCode}</span>
                                                <StatusBadge label={`v${item.templateVersionNumber}`} tone="danger" />
                                                <StatusBadge label={item.status} tone={item.status === "Pending" ? "warning" : item.status === "Approved" ? "success" : "danger"} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-medium text-ink">{item.templateName}</h2>
                                                <div className="mt-1 text-xs font-medium text-ink-3">
                                                    {t("approvals.requestedByOn", undefined, { user: item.requestedBy, date: formatDateTime(item.requestedAt) })}
                                                </div>
                                            </div>
                                            <p className="max-w-3xl text-sm font-medium text-ink-2">{item.businessJustification}</p>
                                        </div>
                                        <Link href={`/approvals/restorations/${item.id}`} className="plms-button-primary">
                                            {t("approvals.openRequest")}
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </section>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
