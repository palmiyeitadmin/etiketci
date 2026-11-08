"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretRight, FileCsv } from "@phosphor-icons/react";
import { RoleGuard } from "@/components/RoleGuard";
import { buildApiUrl } from "@/lib/api-base-url";
import { apiFetch } from "@/lib/api-client";
import { useI18n, useText } from "@/lib/i18n";
import { ImportSessionSummary } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ProductImportPage() {
    const { formatDateTime } = useI18n();
    const router = useRouter();
    const text = useText("products").import;
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ImportSessionSummary[]>([]);

    async function loadSessions() {
        const res = await apiFetch<ImportSessionSummary[]>("/api/Products/import/sessions");
        if (res.success) {
            setSessions(res.data);
        }
    }

    useEffect(() => {
        loadSessions();
    }, []);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(buildApiUrl("/api/Products/import/dry-run"), {
                method: "POST",
                body: formData,
            });

            const json = await res.json();
            if (json.success) {
                router.push(`/products/import/sessions/${json.data.id}`);
                return;
            }

            setError(typeof json.error === "string" ? json.error : json.error?.message || text.uploadFailed);
        } catch {
            setError(text.networkError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="space-y-6">
                <nav className="-mb-3 flex items-center gap-1.5 text-sm text-ink-3">
                    <Link href="/products" className="transition-colors hover:text-ink">{text.parent}</Link>
                    <CaretRight size={12} aria-hidden />
                    <span className="text-ink-2">{text.title}</span>
                </nav>

                <PageHeader title={text.title} description={text.description} />

                <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                    <section className="plms-card space-y-4 p-5">
                        <h2 className="text-md font-medium text-ink">{text.create}</h2>
                        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-8 text-center transition-colors hover:bg-raised focus-within:border-accent">
                            <FileCsv size={24} aria-hidden className="text-ink-3" />
                            <span className="max-w-full truncate text-sm text-ink">{file ? file.name : text.choose}</span>
                            <span className="text-xs text-ink-3">{text.chooseHint}</span>
                            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="sr-only" />
                        </label>
                        <div className="space-y-1.5">
                            <div className="text-sm text-ink-3">{text.headers}</div>
                            <ul className="flex flex-wrap gap-1.5">
                                {["Sku", "Name", "Description", "CategoryCode", "VendorCode"].map((column) => (
                                    <li key={column} className="rounded-md bg-raised px-1.5 py-0.5 font-mono text-xs text-ink-2">{column}</li>
                                ))}
                            </ul>
                        </div>
                        <button className="plms-button-primary w-full" onClick={handleUpload} disabled={!file || loading}>
                            {loading ? text.processing : text.initialize}
                        </button>
                        {error ? <div className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div> : null}
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-md font-medium text-ink">{text.sessions}</h2>
                        {sessions.length === 0 ? (
                            <EmptyState title={text.noSessions} description={text.noSessionsDescription} />
                        ) : (
                            <DataTable columns={[text.file, text.status, text.rows, text.actor, text.created, ""]}>
                                {sessions.map((session) => (
                                    <tr key={session.id} className="transition-colors hover:bg-raised">
                                        <td className="px-4 py-2.5 text-base">
                                            <Link href={`/products/import/sessions/${session.id}`} className="font-mono text-sm text-ink transition-colors hover:text-accent">{session.fileName}</Link>
                                        </td>
                                        <td className="px-4 py-2.5"><StatusBadge label={session.status} tone={session.status === "ReadyToImport" ? "success" : session.status === "Imported" ? "info" : "warning"} /></td>
                                        <td className="tabular whitespace-nowrap px-4 py-2.5 text-base text-ink-2">
                                            <span className="font-mono text-sm">{session.totalRows}</span>
                                            {session.errorRows > 0 ? <span className="text-bad"> · <span className="font-mono text-sm">{session.errorRows}</span> {text.issues}</span> : null}
                                        </td>
                                        <td className="px-4 py-2.5 text-base text-ink-2">{session.createdBy}</td>
                                        <td className="tabular whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-3">{formatDateTime(session.createdAt)}</td>
                                        <td className="px-4 py-1.5 text-right"><Link href={`/products/import/sessions/${session.id}`} className="plms-button-compact">{text.open}</Link></td>
                                    </tr>
                                ))}
                            </DataTable>
                        )}
                    </section>
                </div>
            </div>
        </RoleGuard>
    );
}
