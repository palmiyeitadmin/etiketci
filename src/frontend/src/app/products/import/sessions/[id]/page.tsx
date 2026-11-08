"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n, useText } from "@/lib/i18n";
import { importErrorText, importErrorTypeLabel } from "@/lib/backend-text";
import { ImportCommitResult, ImportSession } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { CaretRight } from "@phosphor-icons/react";
import { useLatest } from "@/lib/useLatest";

export default function ImportSessionDetailPage() {
    const { formatDateTime, locale } = useI18n();
    const params = useParams();
    const id = String(params.id);
    const text = useText("products").importSession;
    const [session, setSession] = useState<ImportSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [confirmCommit, setConfirmCommit] = useState(false);
    const [notice, setNotice] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

    async function load() {
        const res = await apiFetch<ImportSession>(`/api/Products/import/sessions/${id}`);
        if (res.success) {
            setSession(res.data);
        }
        setLoading(false);
    }

    const loadRef = useLatest(load);
    useEffect(() => {
        loadRef.current();
    }, [id, loadRef]);

    const onlyOverwriteConflicts = useMemo(() => {
        if (!session || session.issues.length === 0) return false;
        return session.issues.every((issue) => issue.errorType === "DuplicateInDb");
    }, [session]);

    async function enableOverwrite() {
        setSubmitting(true);
        setNotice(null);
        const res = await apiFetch<ImportSession>(`/api/Products/import/sessions/${id}/overwrite`, { method: "POST" });
        setSubmitting(false);
        if (res.success) {
            setSession(res.data);
            return;
        }
        setNotice({ tone: "bad", text: res.error.message });
    }

    async function commit() {
        setSubmitting(true);
        setNotice(null);
        const res = await apiFetch<ImportCommitResult>(`/api/Products/import/sessions/${id}/commit`, { method: "POST" });
        setSubmitting(false);
        setConfirmCommit(false);

        if (res.success) {
            await load();
            setNotice({ tone: "good", text: text.importedSummary(res.data.importedCount, res.data.updatedCount) });
            return;
        }

        setNotice({ tone: "bad", text: res.error.message });
    }

    const tone = (status: string) => status === "ReadyToImport" ? "success" : status === "Imported" ? "info" : "warning";
    const canOverwrite = session?.status === "ValidationFailed" && onlyOverwriteConflicts && !session.allowOverwrite;
    const canCommit = session?.status === "ReadyToImport";

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="space-y-6">
                <nav className="-mb-3 flex items-center gap-1.5 text-sm text-ink-3">
                    <Link href="/products/import" className="transition-colors hover:text-ink">{text.parent}</Link>
                    <CaretRight size={12} aria-hidden />
                    <span className="text-ink-2">{text.title}</span>
                </nav>

                <PageHeader
                    title={session ? session.fileName : text.title}
                    description={session ? text.createdByOn(session.createdBy, formatDateTime(session.createdAt)) : undefined}
                    actions={session && (canOverwrite || canCommit) ? (
                        <>
                            {canOverwrite ? (
                                <button className="plms-button-secondary" onClick={enableOverwrite} disabled={submitting}>{text.enableOverwrite}</button>
                            ) : null}
                            {canCommit ? (
                                <button className="plms-button-primary" onClick={() => setConfirmCommit(true)} disabled={submitting}>{text.commitImport}</button>
                            ) : null}
                        </>
                    ) : undefined}
                />

                {notice ? (
                    <div role="status" className={`rounded-lg px-3 py-2 text-sm ${notice.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{notice.text}</div>
                ) : null}

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
                ) : !session ? (
                    <EmptyState title={text.notFound} description={text.notFoundDescription} />
                ) : (
                    <div className="space-y-6">
                        <dl className="plms-card flex flex-wrap gap-x-10 gap-y-4 px-5 py-4">
                            <div className="flex flex-col gap-1">
                                <dt className="text-sm text-ink-3">{text.totalRows}</dt>
                                <dd className="tabular text-lg font-medium text-ink">{session.totalRows}</dd>
                            </div>
                            <div className="flex flex-col gap-1">
                                <dt className="text-sm text-ink-3">{text.validRows}</dt>
                                <dd className="tabular text-lg font-medium text-ink">{session.validRows}</dd>
                            </div>
                            <div className="flex flex-col gap-1">
                                <dt className="text-sm text-ink-3">{text.issueRows}</dt>
                                <dd className={`tabular text-lg font-medium ${session.errorRows > 0 ? "text-bad" : "text-ink"}`}>{session.errorRows}</dd>
                            </div>
                            <div className="flex flex-col gap-1">
                                <dt className="text-sm text-ink-3">{text.status}</dt>
                                <dd className="flex h-7 items-center"><StatusBadge label={session.status} tone={tone(session.status)} /></dd>
                            </div>
                        </dl>

                        <section className="space-y-3">
                            <h2 className="text-md font-medium text-ink">{text.rowIssues}</h2>
                            {session.issues.length === 0 ? (
                                <EmptyState title={text.noValidation} description={text.noValidationDescription} />
                            ) : (
                                <DataTable columns={[text.row, text.sku, text.type, text.message]}>
                                    {session.issues.map((issue) => (
                                        <tr key={`${issue.rowNumber}-${issue.sku}-${issue.errorType}`}>
                                            <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-3">{issue.rowNumber}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink">{issue.sku || text.notAvailable}</td>
                                            <td className="px-4 py-2.5"><StatusBadge label={importErrorTypeLabel(locale, issue.errorType)} tone={issue.errorType === "DuplicateInDb" ? "warning" : "danger"} /></td>
                                            <td className="px-4 py-2.5 text-base text-ink-2">{importErrorText(locale, issue)}</td>
                                        </tr>
                                    ))}
                                </DataTable>
                            )}
                        </section>
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
