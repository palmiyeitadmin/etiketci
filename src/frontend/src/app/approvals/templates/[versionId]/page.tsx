"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
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
    const { formatDateTime, locale } = useI18n();
    const params = useParams();
    const versionId = String(params.versionId);
    const text = locale === "tr"
        ? {
            eyebrow: "Onay incelemesi",
            title: "Şablon Onay Detayı",
            description: "İncelemedeki şablon sürümü için odaklı inceleme giriş noktası.",
            open: "Şablon İncelemesini Aç",
            notFound: "Onay kaydı bulunamadı",
            notFoundDescription: "Hedef sürüm artık onay kuyruğunda değil.",
            requestedByOn: "Talep eden {user} - {date}",
            changeNotes: "Değişiklik Notları",
            noNotes: "İnceleme notu girilmedi.",
        }
        : {
            eyebrow: "Approval review",
            title: "Template Approval Detail",
            description: "Focused review entrypoint for an in-review template version.",
            open: "Open Template Review",
            notFound: "Approval record not found",
            notFoundDescription: "The target version is no longer in the approval queue.",
            requestedByOn: "Requested by {user} on {date}",
            changeNotes: "Change Notes",
            noNotes: "No review notes provided.",
        };
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
                    eyebrow={text.eyebrow}
                    title={text.title}
                    description={text.description}
                    actions={item ? <Link href={`/templates/${item.templateId}`} className="plms-button-primary">{text.open}</Link> : null}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>
                ) : !item ? (
                    <EmptyState title={text.notFound} description={text.notFoundDescription} />
                ) : (
                    <div className="space-y-6 rounded-xl border border-line bg-surface p-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">{item.templateCode}</span>
                            <StatusBadge label={`v${item.versionNumber}`} tone="warning" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-medium text-ink">{item.templateName}</h2>
                            <p className="mt-2 text-sm font-medium text-ink-3">
                                {text.requestedByOn.replace("{user}", item.requestedBy).replace("{date}", formatDateTime(item.requestedAt))}
                            </p>
                        </div>
                        <div className="rounded-lg border border-line bg-raised p-5">
                            <div className="text-xs font-medium text-ink-3">{text.changeNotes}</div>
                            <p className="mt-3 text-sm font-medium text-ink-2">{item.reviewCommentSummary || item.changeNotes || text.noNotes}</p>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
