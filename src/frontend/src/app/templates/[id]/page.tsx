"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { LabelTemplate } from "@/types/template";
import Link from "next/link";

export default function TemplateDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [template, setTemplate] = useState<LabelTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const res = await apiFetch<LabelTemplate>(`/api/Templates/${id}`);
            if (res.success && res.data) {
                setTemplate(res.data);
            }
        } catch (err) {
            console.error("Failed to load template", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [id]);

    const handleEdit = () => {
        if (!template) return;
        const draft = template.versions?.find(v => v.status === 'Draft');
        if (draft) {
            router.push(`/templates/${template.id}/edit`);
        } else {
            alert("No Draft version found. Create a New Revision first.");
        }
    };

    const handleNewRevision = async () => {
        if (!template) return;
        const sourceVersionId = template.currentActiveVersionId || template.versions?.[0]?.id;
        if (!sourceVersionId) return;

        if (confirm("Create a new Draft revision based on the current version?")) {
            try {
                const res = await apiFetch(`/api/Templates/${template.id}/revisions?fromVersionId=${sourceVersionId}`, {
                    method: 'POST'
                });
                if (res.success) {
                    await load();
                    router.push(`/templates/${template.id}/edit`);
                }
            } catch (err) {
                alert("Failed to create revision.");
            }
        }
    };

    const handleWorkflowAction = async (versionId: string, action: string) => {
        let endpoint = "";
        let method = "POST";
        let body: any = null;

        switch (action) {
            case 'request-approval':
                endpoint = `/api/Templates/${id}/versions/${versionId}/request-approval`;
                break;
            case 'review':
                const approve = confirm("Approve this version? Click Cancel to Reject.");
                const comments = prompt("Enter review comments (optional):");
                endpoint = `/api/Templates/${id}/versions/${versionId}/review`;
                body = { approve, comments };
                break;
            case 'publish':
                endpoint = `/api/Templates/${id}/versions/${versionId}/publish`;
                break;
        }

        if (!endpoint) return;

        try {
            const res = await apiFetch(endpoint, {
                method,
                body: body ? JSON.stringify(body) : undefined,
                headers: body ? { 'Content-Type': 'application/json' } : undefined
            });

            if (res.success) {
                await load();
            } else {
                alert("Action failed: " + ((res as any).error?.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Workflow action failed", err);
            alert("Workflow action failed.");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!template) return <div className="p-8">Template not found.</div>;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                    <Link href="/templates" className="hover:text-blue-600">Templates</Link>
                    <span>/</span>
                    <span>{template.code}</span>
                </div>

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
                        <p className="text-gray-600 font-mono">{template.code}</p>
                    </div>
                    <div className="flex space-x-4">
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <button
                                onClick={handleEdit}
                                className="bg-white border text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center space-x-2"
                            >
                                <span>✎</span>
                                <span>Edit Draft</span>
                            </button>
                        </RoleGuard>
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <button
                                onClick={handleNewRevision}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                New Revision
                            </button>
                        </RoleGuard>
                        <Link
                            href={`/templates/${template.id}/preview?versionId=${template.currentActiveVersionId || (template.versions && template.versions[0]?.id)}`}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center space-x-2"
                        >
                            <span>👁</span>
                            <span>Print Preview</span>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700">Latest Layout Definition</h3>
                                <div className="flex items-center space-x-2">
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${template.currentActiveVersion?.status === 'Published'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        Active: {template.currentActiveVersion?.status || "None"}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Layout JSON Snapshot</div>
                                <pre className="bg-slate-900 text-emerald-400 p-6 rounded-lg text-[11px] font-mono overflow-x-auto h-96 leading-relaxed border border-slate-800 custom-scrollbar">
                                    {template.currentActiveVersionId
                                        ? template.versions?.find(v => v.id === template.currentActiveVersionId)?.layoutJson
                                        : "// No active version layout available"}
                                </pre>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white border rounded-lg p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-gray-800">Version History</h3>
                                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border uppercase font-bold">
                                    {template.versions?.length || 0} Versions
                                </span>
                            </div>

                            <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-gray-100">
                                {template.versions?.map((v) => (
                                    <div key={v.id} className="relative pl-8">
                                        <div className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ring-1 ${v.status === 'Published' ? 'bg-green-500 ring-green-200' :
                                                v.status === 'Draft' ? 'bg-yellow-400 ring-yellow-100' :
                                                    v.status === 'InReview' ? 'bg-blue-500 ring-blue-100' :
                                                        'bg-gray-400 ring-gray-100'
                                            }`}></div>

                                        <div className="flex flex-col">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm text-gray-900">Version {v.versionNumber}</span>
                                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-tighter ${v.status === 'Published' ? 'bg-green-100 text-green-800 border border-green-200' :
                                                        v.status === 'Draft' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                                                            v.status === 'InReview' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                                                v.status === 'Approved' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                                                                    v.status === 'Rejected' ? 'bg-red-50 text-red-800 border border-red-200' :
                                                                        'bg-gray-50 text-gray-600 border border-gray-200'
                                                    }`}>
                                                    {v.status}
                                                </span>
                                            </div>

                                            <div className="text-[10px] text-gray-400 mb-2 flex items-center">
                                                <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                                                <span className="mx-1.5">·</span>
                                                <span>{v.createdBy}</span>
                                            </div>

                                            {v.changeNotes && (
                                                <p className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded mb-3 border border-gray-100 italic">
                                                    "{v.changeNotes}"
                                                </p>
                                            )}

                                            <div className="flex flex-col space-y-2">
                                                <Link
                                                    href={`/templates/${template.id}/preview?versionId=${v.id}`}
                                                    className="inline-flex items-center text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded transition-colors w-fit"
                                                >
                                                    <span className="mr-1">👁</span> View Preview
                                                </Link>

                                                {/* Workflow Actions */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(v.status === 'Draft' || v.status === 'Rejected') && (
                                                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                                            <button
                                                                onClick={() => handleWorkflowAction(v.id, 'request-approval')}
                                                                className="text-[9px] uppercase font-black bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 shadow-sm transition-all shadow-blue-100"
                                                            >
                                                                Submit for Review
                                                            </button>
                                                        </RoleGuard>
                                                    )}

                                                    {v.status === 'InReview' && (
                                                        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                                            <button
                                                                onClick={() => handleWorkflowAction(v.id, 'review')}
                                                                className="text-[9px] uppercase font-black bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 shadow-sm transition-all"
                                                            >
                                                                Review & Decide
                                                            </button>
                                                        </RoleGuard>
                                                    )}

                                                    {v.status === 'Approved' && (
                                                        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                                            <button
                                                                onClick={() => handleWorkflowAction(v.id, 'publish')}
                                                                className="text-[9px] uppercase font-black bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 shadow-sm transition-all"
                                                            >
                                                                Publish Version
                                                            </button>
                                                        </RoleGuard>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-dashed rounded-lg p-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                {template.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
