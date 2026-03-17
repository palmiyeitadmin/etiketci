"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { buildApiUrl } from "@/lib/api-base-url";
import { apiFetch } from "@/lib/api-client";
import { ImportSessionSummary } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ProductImportPage() {
    const router = useRouter();
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

            setError(typeof json.error === "string" ? json.error : json.error?.message || "Failed to upload file.");
        } catch {
            setError("Network error communicating with API.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow="CSV import workflow"
                    title="Product Import"
                    description="Dry-run validation persists an import session before any data is committed."
                    actions={<Link href="/products" className="plms-button-secondary">Back to Products</Link>}
                />

                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[2rem] border border-dashed border-[color:var(--plms-border-strong)] bg-[color:var(--plms-panel)] p-8 text-center">
                        <div className="mx-auto max-w-md space-y-5">
                            <div className="text-4xl">CSV</div>
                            <div>
                                <h2 className="text-2xl font-black tracking-[-0.05em] text-white">Create Import Session</h2>
                                <p className="mt-2 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                                    Headers must match `Sku,Name,Description,CategoryCode,VendorCode`.
                                </p>
                            </div>
                            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="plms-input" />
                            <button className="plms-button-primary w-full" onClick={handleUpload} disabled={!file || loading}>
                                {loading ? "Processing..." : "Initialize Dry-Run"}
                            </button>
                            {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-300">{error}</div> : null}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-sm font-black uppercase tracking-[0.18em] text-white">Recent Sessions</div>
                        {sessions.length === 0 ? (
                            <EmptyState title="No import sessions" description="Run a dry-run validation to create the first import session." />
                        ) : (
                            <DataTable columns={["File", "Status", "Rows", "Actor", "Created", "Open"]}>
                                {sessions.map((session) => (
                                    <tr key={session.id} className="transition-colors hover:bg-white/5">
                                        <td className="px-6 py-4 text-sm font-bold text-white">{session.fileName}</td>
                                        <td className="px-6 py-4"><StatusBadge label={session.status} tone={session.status === "ReadyToImport" ? "success" : session.status === "Imported" ? "info" : "warning"} /></td>
                                        <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{session.totalRows} / {session.errorRows} issues</td>
                                        <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{session.createdBy}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-subtle)]">{new Date(session.createdAt).toLocaleString()}</td>
                                        <td className="px-6 py-4"><Link href={`/products/import/sessions/${session.id}`} className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">Open</Link></td>
                                    </tr>
                                ))}
                            </DataTable>
                        )}
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
