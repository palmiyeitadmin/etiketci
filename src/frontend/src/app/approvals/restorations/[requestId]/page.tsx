"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { TemplateRestorationRequest } from "@/types/template";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function RestorationApprovalDetailPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = String(params.requestId);
    const [request, setRequest] = useState<TemplateRestorationRequest | null>(null);
    const [comments, setComments] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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
                    eyebrow="Restoration review"
                    title="Archived Template Restoration"
                    description="Review archived version restore requests and decide whether to regenerate a new draft."
                    actions={request ? <Link href={`/templates/${request.templateId}`} className="plms-button-secondary">Open Template</Link> : null}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : !request ? (
                    <EmptyState title="Request not found" description="The restoration request could not be loaded." />
                ) : (
                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{request.templateCode}</span>
                                <StatusBadge label={`v${request.templateVersionNumber}`} tone="danger" />
                                <StatusBadge label={request.status} tone={request.status === "Pending" ? "warning" : request.status === "Approved" ? "success" : "danger"} />
                            </div>
                            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-white">{request.templateName}</h2>
                            <div className="mt-2 text-sm font-medium text-[color:var(--plms-text-subtle)]">Requested by {request.requestedBy} on {new Date(request.requestedAt).toLocaleString()}</div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-6 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Business Justification</div>
                                    <p className="mt-3 text-sm font-medium text-[color:var(--plms-text-muted)]">{request.businessJustification}</p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Target Environment</div>
                                        <div className="mt-2 text-sm font-medium text-white">{request.targetEnvironment || "Not specified"}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Requested Until</div>
                                        <div className="mt-2 text-sm font-medium text-white">{request.requestedUntil ? new Date(request.requestedUntil).toLocaleDateString() : "Open-ended"}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Reviewer Decision</div>
                                <textarea className="plms-input min-h-32" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Enter reviewer comments..." disabled={request.status !== "Pending"} />
                                {request.status === "Pending" ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <button className="rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => review(false)} disabled={submitting}>Reject</button>
                                        <button className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => review(true)} disabled={submitting}>Approve & Create Draft</button>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
                                        Reviewed by {request.reviewedBy || "Unknown"}{request.reviewedAt ? ` on ${new Date(request.reviewedAt).toLocaleString()}` : ""}.
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
