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
            eyebrow: "Geri yukleme incelemesi",
            title: "Arsiv Sablon Geri Yukleme",
            description: "Arsiv surumu geri yukleme taleplerini inceleyin ve yeni taslak olusturulup olusturulmayacagina karar verin.",
            openTemplate: "Sablonu Ac",
            notFound: "Talep bulunamadi",
            notFoundDescription: "Geri yukleme talebi yuklenemedi.",
            requestedByOn: "Talep eden {user} - {date}",
            business: "Is Gerekcesi",
            target: "Hedef Ortam",
            notSpecified: "Belirtilmedi",
            until: "Gecerlilik Sonu",
            openEnded: "Acil son tarih yok",
            decision: "Inceleyici Karari",
            comments: "Inceleyici yorumlarini girin...",
            reject: "Reddet",
            approve: "Onayla ve Taslak Olustur",
            reviewedBy: "Inceleyen {user}{dateText}",
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
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : !request ? (
                    <EmptyState title={text.notFound} description={text.notFoundDescription} />
                ) : (
                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{request.templateCode}</span>
                                <StatusBadge label={`v${request.templateVersionNumber}`} tone="danger" />
                                <StatusBadge label={request.status} tone={request.status === "Pending" ? "warning" : request.status === "Approved" ? "success" : "danger"} />
                            </div>
                            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-white">{request.templateName}</h2>
                            <div className="mt-2 text-sm font-medium text-[color:var(--plms-text-subtle)]">{text.requestedByOn.replace("{user}", request.requestedBy).replace("{date}", formatDateTime(request.requestedAt))}</div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-6 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.business}</div>
                                    <p className="mt-3 text-sm font-medium text-[color:var(--plms-text-muted)]">{request.businessJustification}</p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.target}</div>
                                        <div className="mt-2 text-sm font-medium text-white">{request.targetEnvironment || text.notSpecified}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.until}</div>
                                        <div className="mt-2 text-sm font-medium text-white">{request.requestedUntil ? formatDate(request.requestedUntil) : text.openEnded}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.decision}</div>
                                <textarea className="plms-input min-h-32" value={comments} onChange={(e) => setComments(e.target.value)} placeholder={text.comments} disabled={request.status !== "Pending"} />
                                {request.status === "Pending" ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <button className="rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => review(false)} disabled={submitting}>{text.reject}</button>
                                        <button className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => review(true)} disabled={submitting}>{text.approve}</button>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
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
