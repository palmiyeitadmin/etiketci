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
                                <h3 className="font-semibold text-gray-700">Active Version Layout (JSON Placeholder)</h3>
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${template.currentActiveVersion?.status === 'Published'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {template.currentActiveVersion?.status || "NO ACTIVE VERSION"}
                                </span>
                            </div>
                            <div className="p-6">
                                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto h-64">
                                    {template.currentActiveVersionId
                                        ? template.versions?.find(v => v.id === template.currentActiveVersionId)?.layoutJson
                                        : "// No active version layout available"}
                                </pre>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white border rounded-lg p-6 shadow-sm">
                            <h3 className="font-semibold text-gray-700 mb-4">Version History</h3>
                            <div className="space-y-4">
                                {template.versions?.map((v) => (
                                    <div key={v.id} className="border-l-2 border-blue-500 pl-4 py-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm">Version {v.versionNumber}</span>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${v.status === 'Published' ? 'bg-green-100 text-green-800' :
                                                    v.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                                                        v.status === 'InReview' ? 'bg-blue-100 text-blue-800' :
                                                            v.status === 'Approved' ? 'bg-purple-100 text-purple-800' :
                                                                v.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {v.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">
                                            Created {new Date(v.createdAt).toLocaleDateString()} by {v.createdBy}
                                        </p>
                                        {v.changeNotes && (
                                            <p className="text-xs italic text-gray-600 mb-2">"{v.changeNotes}"</p>
                                        )}
                                        <div className="mb-2">
                                            <Link
                                                href={`/templates/${template.id}/preview?versionId=${v.id}`}
                                                className="text-blue-600 hover:underline text-xs font-bold"
                                            >
                                                View PDF Preview →
                                            </Link>
                                        </div>

                                        {/* Workflow Actions */}
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {(v.status === 'Draft' || v.status === 'Rejected') && (
                                                <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                                    <button
                                                        onClick={() => handleWorkflowAction(v.id, 'request-approval')}
                                                        className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 font-bold"
                                                    >
                                                        Request Approval
                                                    </button>
                                                </RoleGuard>
                                            )}

                                            {v.status === 'InReview' && (
                                                <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                                    <button
                                                        onClick={() => handleWorkflowAction(v.id, 'review')}
                                                        className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded hover:bg-amber-100 font-bold"
                                                    >
                                                        Review
                                                    </button>
                                                </RoleGuard>
                                            )}

                                            {v.status === 'Approved' && (
                                                <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                                    <button
                                                        onClick={() => handleWorkflowAction(v.id, 'publish')}
                                                        className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100 font-bold"
                                                    >
                                                        Publish
                                                    </button>
                                                </RoleGuard>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 border rounded-lg p-6">
                            <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                            <p className="text-sm text-gray-600">
                                {template.description || "No description provided for this template."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
