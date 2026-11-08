"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n, useText } from "@/lib/i18n";
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
    const { formatDateTime } = useI18n();
    const params = useParams();
    const versionId = String(params.versionId);
    const text = useText("approvals").templateReview;
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
            <div className="space-y-6">
                <nav className="-mb-3 flex items-center gap-1.5 text-sm text-ink-3">
                    <Link href="/approvals" className="transition-colors hover:text-ink">{text.parent}</Link>
                    <CaretRight size={12} aria-hidden />
                    <span className="whitespace-nowrap font-mono text-ink-2">{item ? `${item.templateCode} v${item.versionNumber}` : text.title}</span>
                </nav>

                <PageHeader
                    title={item ? item.templateName : text.title}
                    actions={item ? <Link href={`/templates/${item.templateId}`} className="plms-button-primary">{text.open}</Link> : null}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
                ) : !item ? (
                    <EmptyState title={text.notFound} description={text.notFoundDescription} />
                ) : (
                    <div className="plms-card max-w-3xl divide-y divide-line">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 md:grid-cols-4">
                            <div className="flex flex-col gap-1">
                                <dt className="text-sm text-ink-3">{text.code}</dt>
                                <dd className="whitespace-nowrap font-mono text-sm text-ink">{item.templateCode}</dd>
                            </div>
                            <div className="flex flex-col gap-1">
                                <dt className="text-sm text-ink-3">{text.version}</dt>
                                <dd className="flex items-center gap-2"><StatusBadge label={`v${item.versionNumber}`} tone="warning" /></dd>
                            </div>
                            <div className="flex flex-col gap-1">
                                <dt className="text-sm text-ink-3">{text.requestedBy}</dt>
                                <dd className="truncate text-base text-ink">{item.requestedBy}</dd>
                            </div>
                            <div className="flex flex-col gap-1">
                                <dt className="text-sm text-ink-3">{text.requestedAt}</dt>
                                <dd className="tabular whitespace-nowrap font-mono text-sm text-ink">{formatDateTime(item.requestedAt)}</dd>
                            </div>
                        </dl>
                        <div className="flex flex-col gap-1.5 px-5 py-4">
                            <div className="text-sm text-ink-3">{text.changeNotes}</div>
                            <p className="text-base text-ink-2">{item.reviewCommentSummary || item.changeNotes || text.noNotes}</p>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
