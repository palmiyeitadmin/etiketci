"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n, useText } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/PageHeader";
import { TemplateRestorationRequest } from "@/types/template";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function RestorationApprovalDetailPage() {
    const { formatDate, formatDateTime } = useI18n();
    const params = useParams();
    const router = useRouter();
    const requestId = String(params.requestId);
    const [request, setRequest] = useState<TemplateRestorationRequest | null>(null);
    const [comments, setComments] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const text = useText("approvals").restoration;

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
        setError(null);
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

        setError(res.error.message);
    }

    const fact = (label: string, value: React.ReactNode) => (
        <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-sm text-ink-3">{label}</dt>
            <dd className="truncate text-base text-ink">{value}</dd>
        </div>
    );

    return (
        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
            <div className="space-y-6">
                <nav className="-mb-3 flex items-center gap-1.5 text-sm text-ink-3">
                    <Link href="/approvals" className="transition-colors hover:text-ink">{text.parent}</Link>
                    <CaretRight size={12} aria-hidden />
                    <span className="text-ink-2">{text.title}</span>
                </nav>

                <PageHeader
                    title={request ? request.templateName : text.title}
                    description={text.description}
                    actions={request ? <Link href={`/templates/${request.templateId}`} className="plms-button-secondary">{text.openTemplate}</Link> : null}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
                ) : !request ? (
                    <EmptyState title={text.notFound} description={text.notFoundDescription} />
                ) : (
                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="plms-card divide-y divide-line">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 md:grid-cols-3">
                                {fact(text.code, <span className="whitespace-nowrap font-mono text-sm">{request.templateCode}</span>)}
                                {fact(text.version, <span className="tabular font-mono text-sm">v{request.templateVersionNumber}</span>)}
                                {fact(text.status, <StatusBadge label={request.status} tone={request.status === "Pending" ? "warning" : request.status === "Approved" ? "success" : "danger"} />)}
                                {fact(text.requestedBy, request.requestedBy)}
                                {fact(text.requestedAt, <span className="tabular font-mono text-sm">{formatDateTime(request.requestedAt)}</span>)}
                                {fact(text.target, request.targetEnvironment || text.notSpecified)}
                                {fact(text.until, request.requestedUntil ? <span className="tabular font-mono text-sm">{formatDate(request.requestedUntil)}</span> : text.openEnded)}
                            </dl>
                            <div className="flex flex-col gap-1.5 px-5 py-4">
                                <div className="text-sm text-ink-3">{text.business}</div>
                                <p className="text-base text-ink-2">{request.businessJustification}</p>
                            </div>
                        </div>

                        <section className="plms-card space-y-4 p-5">
                            <h2 className="text-md font-medium text-ink">{text.decision}</h2>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="review-comments" className="plms-label">{text.commentsLabel}</label>
                                <textarea id="review-comments" className="plms-input min-h-32" value={comments} onChange={(e) => setComments(e.target.value)} placeholder={text.comments} disabled={request.status !== "Pending"} />
                            </div>
                            {error ? <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div> : null}
                            {request.status === "Pending" ? (
                                <div className="flex flex-wrap justify-end gap-2">
                                    <button className="plms-button-danger" onClick={() => review(false)} disabled={submitting}>{text.reject}</button>
                                    <button className="plms-button-primary" onClick={() => review(true)} disabled={submitting}>{text.approve}</button>
                                </div>
                            ) : (
                                <p className="text-sm text-ink-3">
                                    {text.reviewedBy(request.reviewedBy || text.unknown, request.reviewedAt ? ` · ${formatDateTime(request.reviewedAt)}` : "")}
                                </p>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
