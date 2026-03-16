"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import Link from "next/link";

export default function TemplateDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [template, setTemplate] = useState<LabelTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; versionId: string; versionNumber: number } | null>(null);
    const [reviewComments, setReviewComments] = useState("");

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

    const handleWorkflowAction = async (versionId: string, action: string, data?: any) => {
        let endpoint = "";
        let body: any = data;

        switch (action) {
            case 'request-approval':
                endpoint = `/api/Templates/${id}/versions/${versionId}/request-approval`;
                break;
            case 'review':
                endpoint = `/api/Templates/${id}/versions/${versionId}/review`;
                break;
            case 'publish':
                endpoint = `/api/Templates/${id}/versions/${versionId}/publish`;
                break;
        }

        if (!endpoint) return;

        try {
            const res = await apiFetch(endpoint, {
                method: 'POST',
                body: body ? JSON.stringify(body) : undefined,
                headers: body ? { 'Content-Type': 'application/json' } : undefined
            });

            if (res.success) {
                await load();
                if (action === 'review') {
                    setReviewModal(null);
                    setReviewComments("");
                }
            } else {
                alert("Action failed: " + ((res as any).error || "Unknown error"));
            }
        } catch (err) {
            console.error("Workflow action failed", err);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (!template) return <div className="p-8 text-center text-slate-500 font-bold">Template not found.</div>;

    const draftVersion = template.versions?.find(v => v.status === 'Draft' || v.status === 'Rejected');

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8 max-w-7xl mx-auto">
                {/* Breadcrumbs */}
                <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 border-b border-slate-100 pb-4">
                    <Link href="/templates" className="hover:text-blue-600 transition-colors">Label Templates</Link>
                    <span className="text-slate-200">/</span>
                    <span className="text-slate-900">{template.code}</span>
                </div>

                {/* Header Section */}
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{template.name}</h1>
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                {template.code}
                            </span>
                        </div>
                        <p className="text-slate-500 max-w-2xl font-medium">{template.description || "System-defined industrial label template model."}</p>
                    </div>
                    <div className="flex space-x-3">
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <button
                                onClick={handleNewRevision}
                                className="bg-slate-800 text-white px-5 py-2.5 rounded font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-sm"
                            >
                                New Revision
                            </button>
                        </RoleGuard>
                        <Link
                            href={`/templates/${template.id}/preview?versionId=${template.currentActiveVersionId || (template.versions && template.versions[0]?.id)}`}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
                        >
                            Open Preview
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                    {/* Left Panel: Snapshot & Details */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Status Quick Look */}
                        <div className="flex gap-4">
                            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                                <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3">Active Production Version</div>
                                {template.currentActiveVersion ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-2xl font-black text-slate-900">V{template.currentActiveVersion.versionNumber}</span>
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Published</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">ID: {template.currentActiveVersionId?.slice(0, 8)}...</div>
                                    </div>
                                ) : (
                                    <div className="text-slate-400 font-bold italic text-sm py-1">No version currently published.</div>
                                )}
                            </div>
                            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 shadow-sm overflow-hidden relative">
                                <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3">Governance Status</div>
                                <div className="flex items-center space-x-3">
                                    <span className={`w-3 h-3 rounded-full animate-pulse ${draftVersion ? 'bg-amber-400' : 'bg-slate-200'}`}></span>
                                    <span className="text-sm font-bold text-slate-700">
                                        {draftVersion ? `Draft V${draftVersion.versionNumber} in progress` : "All versions finalized"}
                                    </span>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 text-slate-900 font-black text-6xl italic select-none">GOV</div>
                            </div>
                        </div>

                        {/* Layout Snapshot */}
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Master Layout Snapshot</h3>
                                <span className="text-[10px] font-mono text-slate-400">READ-ONLY VIEW</span>
                            </div>
                            <div className="p-8">
                                <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 shadow-inner relative group">
                                    <div className="absolute top-4 right-4 text-[9px] font-mono text-slate-700 group-hover:text-emerald-500 transition-colors uppercase">canonical_model.json</div>
                                    <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto h-[480px] custom-scrollbar">
                                        {template.currentActiveVersionId
                                            ? template.versions?.find(v => v.id === template.currentActiveVersionId)?.layoutJson
                                            : "// Select a version to see layout snapshot"}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Version History Timeline */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm h-full">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Version History</h3>
                                <div className="text-[9px] font-black text-white bg-slate-900 px-2 py-0.5 rounded uppercase tracking-tighter">
                                    Total {template.versions?.length || 0}
                                </div>
                            </div>

                            <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 before:w-px before:bg-slate-100">
                                {template.versions?.map((v) => (
                                    <div key={v.id} className="relative pl-10 group">
                                        {/* Timeline Dot */}
                                        <div className={`absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ring-2 ${v.status === 'Published' ? 'bg-emerald-500 ring-emerald-50' :
                                                v.status === 'Draft' ? 'bg-amber-400 ring-amber-50' :
                                                    v.status === 'InReview' ? 'bg-blue-500 ring-blue-50' :
                                                        v.status === 'Rejected' ? 'bg-red-500 ring-red-50' :
                                                            'bg-slate-200 ring-slate-50'
                                            }`}></div>

                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="font-black text-slate-900 text-sm tracking-tight uppercase">V{v.versionNumber}</span>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest border border-current uppercase min-w-[60px] text-center ${v.status === 'Published' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                                                        v.status === 'Draft' ? 'text-amber-700 bg-amber-50 border-amber-100' :
                                                            v.status === 'InReview' ? 'text-blue-700 bg-blue-50 border-blue-100' :
                                                                v.status === 'Approved' ? 'text-purple-700 bg-purple-50 border-purple-100' :
                                                                    v.status === 'Rejected' ? 'text-red-700 bg-red-50 border-red-100' :
                                                                        'text-slate-500 bg-slate-50 border-slate-100'
                                                    }`}>
                                                    {v.status}
                                                </span>
                                            </div>

                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter flex items-center mb-2">
                                                <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                                                <span className="mx-2 opacity-50">·</span>
                                                <span className="text-slate-600">{v.createdBy}</span>
                                            </div>

                                            {v.changeNotes && (
                                                <div className="text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg mb-3 border border-slate-100 italic font-medium leading-relaxed group-hover:bg-amber-50 group-hover:border-amber-100 transition-all">
                                                    "{v.changeNotes}"
                                                </div>
                                            )}

                                            <div className="flex flex-col space-y-2">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(v.status === 'Draft' || v.status === 'Rejected') && (
                                                        <>
                                                            <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                                                <button
                                                                    onClick={() => router.push(`/templates/${template.id}/edit`)}
                                                                    className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-50 transition-all font-mono"
                                                                >
                                                                    Open Editor
                                                                </button>
                                                            </RoleGuard>
                                                            <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                                                <button
                                                                    onClick={() => handleWorkflowAction(v.id, 'request-approval')}
                                                                    className="text-[9px] font-black uppercase tracking-widest text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700 transition-all shadow-sm shadow-blue-50"
                                                                >
                                                                    Submit Review
                                                                </button>
                                                            </RoleGuard>
                                                        </>
                                                    )}

                                                    {v.status === 'InReview' && (
                                                        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                                            <button
                                                                onClick={() => setReviewModal({ isOpen: true, versionId: v.id, versionNumber: v.versionNumber })}
                                                                className="w-full text-[9px] font-black uppercase tracking-widest text-white bg-slate-900 px-3 py-1.5 rounded hover:bg-black transition-all shadow-md"
                                                            >
                                                                Enter Governance Review
                                                            </button>
                                                        </RoleGuard>
                                                    )}

                                                    {v.status === 'Approved' && (
                                                        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                                            <button
                                                                onClick={() => handleWorkflowAction(v.id, 'publish')}
                                                                className="w-full text-[9px] font-black uppercase tracking-widest text-white bg-emerald-600 px-3 py-1.5 rounded hover:bg-emerald-700 transition-all shadow-sm"
                                                            >
                                                                Confirm Publication
                                                            </button>
                                                        </RoleGuard>
                                                    )}

                                                    <Link
                                                        href={`/templates/${template.id}/preview?versionId=${v.id}`}
                                                        className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 px-2 py-1.5 transition-colors font-mono"
                                                    >
                                                        [Snapshot View]
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Industrial Review Dialog */}
                {reviewModal?.isOpen && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                            <div className="p-8 border-b border-slate-100">
                                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3">Governance Workflow</h3>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Review Version {reviewModal.versionNumber}</h2>
                                <p className="text-slate-500 text-sm mt-2 font-medium italic">You are acting as a System Reviewer. Your decision will be audited and logged.</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Review Comments & Justification</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all h-32 custom-scrollbar"
                                        placeholder="Enter audit-ready notes for this decision..."
                                        value={reviewComments}
                                        onChange={(e) => setReviewComments(e.target.value)}
                                    ></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleWorkflowAction(reviewModal.versionId, 'review', { approve: false, comments: reviewComments })}
                                        className="bg-red-50 text-red-700 border border-red-100 font-black text-[11px] uppercase tracking-widest py-3 rounded-xl hover:bg-red-100 transition-all"
                                    >
                                        Reject Revision
                                    </button>
                                    <button
                                        onClick={() => handleWorkflowAction(reviewModal.versionId, 'review', { approve: true, comments: reviewComments })}
                                        className="bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                                    >
                                        Approve Version
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 flex justify-center">
                                <button
                                    onClick={() => setReviewModal(null)}
                                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                                >
                                    Cancel Review
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}

