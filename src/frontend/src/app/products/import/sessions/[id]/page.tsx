"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { ImportCommitResult, ImportSession } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function ImportSessionDetailPage() {
    const params = useParams();
    const id = String(params.id);
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
            alert(`Imported ${res.data.importedCount} rows, updated ${res.data.updatedCount} rows.`);
            return;
        }

        alert(res.error.message);
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow="Import session"
                    title={session ? session.fileName : "Import Session"}
                    description="Session detail, row-level issues and commit controls."
                    actions={<Link href="/products/import" className="plms-button-secondary">Back to Import</Link>}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : !session ? (
                    <EmptyState title="Import session not found" description="The requested import session could not be loaded." />
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-5 md:grid-cols-4">
                            <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Total Rows</div><div className="mt-3 text-3xl font-black text-white">{session.totalRows}</div></div>
                            <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Valid Rows</div><div className="mt-3 text-3xl font-black text-emerald-300">{session.validRows}</div></div>
                            <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Issue Rows</div><div className="mt-3 text-3xl font-black text-amber-300">{session.errorRows}</div></div>
                            <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Status</div><div className="mt-3"><StatusBadge label={session.status} tone={session.status === "ReadyToImport" ? "success" : session.status === "Imported" ? "info" : "warning"} /></div></div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
                            {session.status === "ValidationFailed" && onlyOverwriteConflicts && !session.allowOverwrite ? (
                                <button className="plms-button-secondary" onClick={enableOverwrite} disabled={submitting}>Enable Overwrite</button>
                            ) : null}
                            {session.status === "ReadyToImport" ? (
                                <button className="plms-button-primary" onClick={() => setConfirmCommit(true)} disabled={submitting}>Commit Import</button>
                            ) : null}
                            <div className="text-xs font-medium text-[color:var(--plms-text-subtle)]">
                                Created by {session.createdBy} on {new Date(session.createdAt).toLocaleString()}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                            <div className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-white">Row Issues</div>
                            {session.issues.length === 0 ? (
                                <EmptyState title="No validation issues" description="This session is clean and can be committed directly." />
                            ) : (
                                <div className="space-y-3">
                                    {session.issues.map((issue) => (
                                        <div key={`${issue.rowNumber}-${issue.sku}-${issue.errorType}`} className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="font-mono text-xs text-[color:var(--plms-text-subtle)]">Row {issue.rowNumber}</span>
                                                <StatusBadge label={issue.errorType} tone={issue.errorType === "DuplicateInDb" ? "warning" : "danger"} />
                                                <span className="text-sm font-bold text-white">{issue.sku || "N/A"}</span>
                                            </div>
                                            <p className="mt-3 text-sm font-medium text-[color:var(--plms-text-muted)]">{issue.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <ConfirmModal
                    open={confirmCommit}
                    title="Commit import session"
                    description="This will apply inserts and overwrite-approved updates in a single transaction."
                    confirmLabel="Commit Import"
                    tone="primary"
                    onCancel={() => setConfirmCommit(false)}
                    onConfirm={commit}
                    loading={submitting}
                />
            </div>
        </RoleGuard>
    );
}
