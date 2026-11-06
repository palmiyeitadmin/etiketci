"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
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
    const { formatDateTime, locale } = useI18n();
    const text = locale === "tr"
        ? {
            title: "Onaylar",
            description: "Onay bekleyen şablon sürümleri ve geri yükleme talepleri.",
            emptyTitle: "Bekleyen onay yok",
            emptyDescription: "İncelemeye gönderilen şablon sürümleri ve geri yükleme talepleri burada görünür.",
            templateReviews: "Şablon sürümleri",
            noTemplateReviews: "Onay bekleyen sürüm yok",
            noTemplateReviewsDescription: "İncelemeye gönderilen sürümler burada görünür.",
            restorationRequests: "Geri yükleme talepleri",
            noRestorationRequests: "Geri yükleme talebi yok",
            noRestorationRequestsDescription: "Arşivden geri yükleme talepleri burada görünür.",
            code: "Kod",
            template: "Şablon",
            version: "Sürüm",
            status: "Durum",
            requestedBy: "Talep eden",
            requestedAt: "Tarih",
            note: "Not",
            openReview: "İncele",
            openRequest: "İncele",
        }
        : {
            title: "Approvals",
            description: "Template versions and restoration requests waiting for review.",
            emptyTitle: "Nothing waiting for approval",
            emptyDescription: "Template versions sent for review and restoration requests appear here.",
            templateReviews: "Template versions",
            noTemplateReviews: "No versions waiting",
            noTemplateReviewsDescription: "Versions sent for review appear here.",
            restorationRequests: "Restoration requests",
            noRestorationRequests: "No restoration requests",
            noRestorationRequestsDescription: "Requests to restore archived versions appear here.",
            code: "Code",
            template: "Template",
            version: "Version",
            status: "Status",
            requestedBy: "Requested by",
            requestedAt: "Date",
            note: "Note",
            openReview: "Review",
            openRequest: "Review",
        };
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

    const cell = "px-4 py-2.5 text-base";

    return (
        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
            <div className="space-y-6">
                <PageHeader title={text.title} description={text.description} />

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
                    </div>
                ) : approvals.length === 0 && restorations.length === 0 ? (
                    <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
                ) : (
                    <div className="space-y-8">
                        <section className="space-y-3">
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-md font-medium text-ink">{text.templateReviews}</h2>
                                <span className="tabular font-mono text-sm text-ink-3">{approvals.length}</span>
                            </div>
                            {approvals.length === 0 ? (
                                <EmptyState title={text.noTemplateReviews} description={text.noTemplateReviewsDescription} />
                            ) : (
                                <DataTable columns={[text.code, text.template, text.version, text.requestedBy, text.requestedAt, text.note, ""]}>
                                    {approvals.map((item) => {
                                        const note = item.reviewCommentSummary || item.changeNotes;
                                        return (
                                            <tr key={item.versionId} className="transition-colors hover:bg-raised">
                                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">{item.templateCode}</td>
                                                <td className={cell}>
                                                    <Link href={`/approvals/templates/${item.versionId}`} className="text-ink transition-colors hover:text-accent">{item.templateName}</Link>
                                                </td>
                                                <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">v{item.versionNumber}</td>
                                                <td className={`${cell} whitespace-nowrap text-ink-2`}>{item.requestedBy}</td>
                                                <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-3">{formatDateTime(item.requestedAt)}</td>
                                                <td className={`${cell} max-w-xs truncate text-ink-3`} title={note || undefined}>{note || "–"}</td>
                                                <td className="px-4 py-1.5 text-right">
                                                    <Link href={`/approvals/templates/${item.versionId}`} className="plms-button-compact">{text.openReview}</Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </DataTable>
                            )}
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-md font-medium text-ink">{text.restorationRequests}</h2>
                                <span className="tabular font-mono text-sm text-ink-3">{restorations.length}</span>
                            </div>
                            {restorations.length === 0 ? (
                                <EmptyState title={text.noRestorationRequests} description={text.noRestorationRequestsDescription} />
                            ) : (
                                <DataTable columns={[text.code, text.template, text.version, text.status, text.requestedBy, text.requestedAt, text.note, ""]}>
                                    {restorations.map((item) => (
                                        <tr key={item.id} className="transition-colors hover:bg-raised">
                                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">{item.templateCode}</td>
                                            <td className={cell}>
                                                <Link href={`/approvals/restorations/${item.id}`} className="text-ink transition-colors hover:text-accent">{item.templateName}</Link>
                                            </td>
                                            <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">v{item.templateVersionNumber}</td>
                                            <td className="px-4 py-2.5"><StatusBadge label={item.status} tone={item.status === "Pending" ? "warning" : item.status === "Approved" ? "success" : "danger"} /></td>
                                            <td className={`${cell} whitespace-nowrap text-ink-2`}>{item.requestedBy}</td>
                                            <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-3">{formatDateTime(item.requestedAt)}</td>
                                            <td className={`${cell} max-w-xs truncate text-ink-3`} title={item.businessJustification}>{item.businessJustification || "–"}</td>
                                            <td className="px-4 py-1.5 text-right">
                                                <Link href={`/approvals/restorations/${item.id}`} className="plms-button-compact">{text.openRequest}</Link>
                                            </td>
                                        </tr>
                                    ))}
                                </DataTable>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
