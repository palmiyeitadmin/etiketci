"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/PageHeader";
import { TemplateRestorationRequest } from "@/types/template";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function RestorationApprovalDetailPage() {
    const { formatDate, formatDateTime, locale } = useI18n();
    const params = useParams();
    const router = useRouter();
    const requestId = String(params.requestId);
    const [request, setRequest] = useState<TemplateRestorationRequest | null>(null);
    const [comments, setComments] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const text = locale === "tr"
        ? {
            eyebrow: "Geri yükleme incelemesi",
            title: "Arşiv Şablon Geri Yükleme",
            description: "Arşiv sürümü geri yükleme taleplerini inceleyin ve yeni taslak oluşturulup oluşturulmayacağına karar verin.",
            openTemplate: "Şablonu Aç",
            notFound: "Talep bulunamadı",
            notFoundDescription: "Geri yükleme talebi yüklenemedi.",
            requestedByOn: "Talep eden {user} - {date}",
            business: "İş Gerekçesi",
            target: "Hedef Ortam",
            notSpecified: "Belirtilmedi",
            until: "Geçerlilik Sonu",
            openEnded: "Son tarih yok",
            decision: "İnceleyici Kararı",
            comments: "İnceleyici yorumlarını girin...",
            reject: "Reddet",
            approve: "Onayla ve Taslak Oluştur",
            reviewedBy: "İnceleyen {user}{dateText}",
            unknown: "Bilinmiyor",
        }
        : {
            eyebrow: "Restoration review",
            title: "Archived Template Restoration",
            description: "Review archived version restore requests and decide whether to regenerate a new draft.",
            openTemplate: "Open Template",
            notFound: "Request not found",
            notFoundDescription: "The restoration request could not be loaded.",
            requestedByOn: "Requested by {user} on {date}",
            business: "Business Justification",
            target: "Target Environment",
            notSpecified: "Not specified",
            until: "Requested Until",
            openEnded: "Open-ended",
            decision: "Reviewer Decision",
            comments: "Enter reviewer comments...",
            reject: "Reject",
            approve: "Approve & Create Draft",
            reviewedBy: "Reviewed by {user}{dateText}",
            unknown: "Unknown",
        };

    async function load() {
        const res = await apiFetch<TemplateRestorationRequest>(`/api/Templates/restoration-approvals/${requestId}`);
        if (res.success) {
            setRequest(res.data);
            setComments(res.data.reviewComments || "");
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, [requestId]);

    async function review(approve: boolean) {
        setSubmitting(true);
        const res = await apiFetch<TemplateRestorationRequest>(`/api/Templates/restoration-approvals/${requestId}/review`, {
            method: "POST",
            body: JSON.stringify({ approve, comments }),
        });
        setSubmitting(false);

        if (res.success) {
            setRequest(res.data);
            if (approve && res.data.restoredVersionId) {
                router.push(`/templates/${res.data.templateId}`);
            }
            return;
        }

        alert(res.error.message);
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
            <div className="mx-auto max-w-5xl space-y-6">
                <PageHeader
                    eyebrow={text.eyebrow}
                    title={text.title}
                    description={text.description}
                    actions={request ? <Link href={`/templates/${request.templateId}`} className="plms-button-secondary">{text.openTemplate}</Link> : null}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>
                ) : !request ? (
                    <EmptyState title={text.notFound} description={text.notFoundDescription} />
                ) : (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-line bg-surface p-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">{request.templateCode}</span>
                                <StatusBadge label={`v${request.templateVersionNumber}`} tone="danger" />
                                <StatusBadge label={request.status} tone={request.status === "Pending" ? "warning" : request.status === "Approved" ? "success" : "danger"} />
                            </div>
                            <h2 className="mt-4 text-3xl font-medium text-ink">{request.templateName}</h2>
                            <div className="mt-2 text-sm font-medium text-ink-3">{text.requestedByOn.replace("{user}", request.requestedBy).replace("{date}", formatDateTime(request.requestedAt))}</div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-6 rounded-xl border border-line bg-surface p-6">
                                <div>
                                    <div className="text-xs font-medium text-ink-3">{text.business}</div>
                                    <p className="mt-3 text-sm font-medium text-ink-2">{request.businessJustification}</p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <div className="text-xs font-medium text-ink-3">{text.target}</div>
                                        <div className="mt-2 text-sm font-medium text-ink">{request.targetEnvironment || text.notSpecified}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-ink-3">{text.until}</div>
                                        <div className="mt-2 text-sm font-medium text-ink">{request.requestedUntil ? formatDate(request.requestedUntil) : text.openEnded}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
                                <div className="text-xs font-medium text-ink-3">{text.decision}</div>
                                <textarea className="plms-input min-h-32" value={comments} onChange={(e) => setComments(e.target.value)} placeholder={text.comments} disabled={request.status !== "Pending"} />
                                {request.status === "Pending" ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <button className="rounded-lg bg-bad px-4 py-3 text-xs font-medium text-white" onClick={() => review(false)} disabled={submitting}>{text.reject}</button>
                                        <button className="rounded-lg bg-good px-4 py-3 text-xs font-medium text-white" onClick={() => review(true)} disabled={submitting}>{text.approve}</button>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-line bg-raised p-4 text-sm font-medium text-ink-2">
                                        {text.reviewedBy.replace("{user}", request.reviewedBy || text.unknown).replace("{dateText}", request.reviewedAt ? ` - ${formatDateTime(request.reviewedAt)}` : "")}.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
