"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

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

export default function ApprovalReviewDetailPage() {
    const params = useParams();
    const versionId = String(params.versionId);
    const [item, setItem] = useState<ApprovalSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await apiFetch<ApprovalSummary[]>("/api/Templates/approvals");
            if (res.success) {
                setItem(res.data.find((entry) => entry.versionId === versionId) || null);
            }
            setLoading(false);
        }

        load();
    }, [versionId]);

    return (
        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
            <div className="mx-auto max-w-4xl space-y-6">
                <PageHeader
                    eyebrow="Approval review"
                    title="Template Approval Detail"
                    description="Focused review entrypoint for an in-review template version."
                    actions={item ? <Link href={`/templates/${item.templateId}`} className="plms-button-primary">Open Template Review</Link> : null}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : !item ? (
                    <EmptyState title="Approval record not found" description="The target version is no longer in the approval queue." />
                ) : (
                    <div className="space-y-6 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{item.templateCode}</span>
                            <StatusBadge label={`v${item.versionNumber}`} tone="warning" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-[-0.05em] text-white">{item.templateName}</h2>
                            <p className="mt-2 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                                Requested by {item.requestedBy} on {new Date(item.requestedAt).toLocaleString()}.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Change Notes</div>
                            <p className="mt-3 text-sm font-medium text-[color:var(--plms-text-muted)]">{item.reviewCommentSummary || item.changeNotes || "No review notes provided."}</p>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
