"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { ImportCommitResult, ImportSession } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function ImportSessionDetailPage() {
    const { formatDateTime, locale } = useI18n();
    const params = useParams();
    const id = String(params.id);
    const text = locale === "tr"
        ? {
            eyebrow: "İçe aktarım oturumu",
            title: "İçe Aktarım Oturumu",
            description: "Oturum detayı, satır bazlı sorunlar ve commit kontrolleri.",
            back: "İçe Aktarıma Dön",
            notFound: "İçe aktarım oturumu bulunamadı",
            notFoundDescription: "İstenen içe aktarım oturumu yüklenemedi.",
            totalRows: "Toplam Satır",
            validRows: "Geçerli Satır",
            issueRows: "Sorunlu Satır",
            status: "Durum",
            enableOverwrite: "Üzerine Yazmayı Etkinleştir",
            commitImport: "Ürünleri kaydet",
            createdByOn: "Oluşturan {user} - {date}",
            rowIssues: "Satır Sorunları",
            noValidation: "Doğrulama sorunu yok",
            noValidationDescription: "Bu oturum temiz ve doğrudan commit edilebilir.",
            row: "Satır",
            notAvailable: "Yok",
            commitTitle: "İçe aktarım oturumunu commit et",
            commitDescription: "Bu işlem eklemeleri ve üzerine yazma onaylı güncellemeleri tek bir transaction içinde uygular.",
            importedSummary: "İçe aktarılan {imported}, güncellenen {updated}.",
        }
        : {
            eyebrow: "Import session",
            title: "Import Session",
            description: "Session detail, row-level issues and commit controls.",
            back: "Back to Import",
            notFound: "Import session not found",
            notFoundDescription: "The requested import session could not be loaded.",
            totalRows: "Total Rows",
            validRows: "Valid Rows",
            issueRows: "Issue Rows",
            status: "Status",
            enableOverwrite: "Enable Overwrite",
            commitImport: "Commit Import",
            createdByOn: "Created by {user} on {date}",
            rowIssues: "Row Issues",
            noValidation: "No validation issues",
            noValidationDescription: "This session is clean and can be committed directly.",
            row: "Row",
            notAvailable: "N/A",
            commitTitle: "Commit import session",
            commitDescription: "This will apply inserts and overwrite-approved updates in a single transaction.",
            importedSummary: "Imported {imported} rows, updated {updated} rows.",
        };
    const [session, setSession] = useState<ImportSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [confirmCommit, setConfirmCommit] = useState(false);

    async function load() {
        const res = await apiFetch<ImportSession>(`/api/Products/import/sessions/${id}`);
        if (res.success) {
            setSession(res.data);
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, [id]);

    const onlyOverwriteConflicts = useMemo(() => {
        if (!session || session.issues.length === 0) return false;
        return session.issues.every((issue) => issue.errorType === "DuplicateInDb");
    }, [session]);

    async function enableOverwrite() {
        setSubmitting(true);
        const res = await apiFetch<ImportSession>(`/api/Products/import/sessions/${id}/overwrite`, { method: "POST" });
        setSubmitting(false);
        if (res.success) {
            setSession(res.data);
            return;
        }
        alert(res.error.message);
    }

    async function commit() {
        setSubmitting(true);
        const res = await apiFetch<ImportCommitResult>(`/api/Products/import/sessions/${id}/commit`, { method: "POST" });
        setSubmitting(false);
        setConfirmCommit(false);

        if (res.success) {
            await load();
            alert(text.importedSummary.replace("{imported}", String(res.data.importedCount)).replace("{updated}", String(res.data.updatedCount)));
            return;
        }

        alert(res.error.message);
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow={text.eyebrow}
                    title={session ? session.fileName : text.title}
                    description={text.description}
                    actions={<Link href="/products/import" className="plms-button-secondary">{text.back}</Link>}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>
                ) : !session ? (
                    <EmptyState title={text.notFound} description={text.notFoundDescription} />
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-5 md:grid-cols-4">
                            <div className="rounded-xl border border-line bg-surface p-5"><div className="text-xs font-medium text-ink-3">{text.totalRows}</div><div className="mt-3 text-3xl font-medium text-ink">{session.totalRows}</div></div>
                            <div className="rounded-xl border border-line bg-surface p-5"><div className="text-xs font-medium text-ink-3">{text.validRows}</div><div className="mt-3 text-3xl font-medium text-good">{session.validRows}</div></div>
                            <div className="rounded-xl border border-line bg-surface p-5"><div className="text-xs font-medium text-ink-3">{text.issueRows}</div><div className="mt-3 text-3xl font-medium text-warn">{session.errorRows}</div></div>
                            <div className="rounded-xl border border-line bg-surface p-5"><div className="text-xs font-medium text-ink-3">{text.status}</div><div className="mt-3"><StatusBadge label={session.status} tone={session.status === "ReadyToImport" ? "success" : session.status === "Imported" ? "info" : "warning"} /></div></div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-5">
                            {session.status === "ValidationFailed" && onlyOverwriteConflicts && !session.allowOverwrite ? (
                                <button className="plms-button-secondary" onClick={enableOverwrite} disabled={submitting}>{text.enableOverwrite}</button>
                            ) : null}
                            {session.status === "ReadyToImport" ? (
                                <button className="plms-button-primary" onClick={() => setConfirmCommit(true)} disabled={submitting}>{text.commitImport}</button>
                            ) : null}
                            <div className="text-xs font-medium text-ink-3">
                                {text.createdByOn.replace("{user}", session.createdBy).replace("{date}", formatDateTime(session.createdAt))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-line bg-surface p-6">
                            <div className="mb-4 text-sm font-medium text-ink">{text.rowIssues}</div>
                            {session.issues.length === 0 ? (
                                <EmptyState title={text.noValidation} description={text.noValidationDescription} />
                            ) : (
                                <div className="space-y-3">
                                    {session.issues.map((issue) => (
                                        <div key={`${issue.rowNumber}-${issue.sku}-${issue.errorType}`} className="rounded-lg border border-line bg-raised p-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="font-mono text-xs text-ink-3">{text.row} {issue.rowNumber}</span>
                                                <StatusBadge label={issue.errorType} tone={issue.errorType === "DuplicateInDb" ? "warning" : "danger"} />
                                                <span className="text-sm font-medium text-ink">{issue.sku || text.notAvailable}</span>
                                            </div>
                                            <p className="mt-3 text-sm font-medium text-ink-2">{issue.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <ConfirmModal
                    open={confirmCommit}
                    title={text.commitTitle}
                    description={text.commitDescription}
                    confirmLabel={text.commitImport}
                    tone="primary"
                    onCancel={() => setConfirmCommit(false)}
                    onConfirm={commit}
                    loading={submitting}
                />
            </div>
        </RoleGuard>
    );
}
