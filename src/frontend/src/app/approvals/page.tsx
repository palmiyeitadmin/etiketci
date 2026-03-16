"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import Link from "next/link";

interface ApprovalSummary {
    templateId: string;
    templateName: string;
    templateCode: string;
    versionId: string;
    versionNumber: number;
    requestedAt: string;
    requestedBy: string;
    changeNotes?: string;
}

export default function ApprovalQueuePage() {
    const [approvals, setApprovals] = useState<ApprovalSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch<ApprovalSummary[]>("/api/Templates/approvals");
                if (res.success && res.data) {
                    setApprovals(res.data);
                }
            } catch (err) {
                console.error("Failed to load approval queue", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
            <div className="p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Approval Queue</h1>
                        <p className="text-sm text-slate-500 mt-1">Review and govern pending label template revisions across the system.</p>
                    </div>
                    <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded border border-blue-100 uppercase tracking-widest">
                        {approvals.length} Pending Actions
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-slate-500 font-medium">Fetching Pending Reviews...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {approvals.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
                                <div className="text-slate-200 mb-4 flex justify-center">
                                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-600">Queue is Clear</h3>
                                <p className="text-slate-400 text-sm mt-1">All template revisions have been processed. No pending reviews.</p>
                            </div>
                        ) : (
                            approvals.map((item) => (
                                <div key={item.versionId} className="bg-white border border-slate-200 rounded-lg overflow-hidden flex items-stretch shadow-sm hover:border-blue-300 transition-colors group">
                                    <div className="w-2 bg-amber-400"></div>
                                    <div className="p-6 flex-grow flex flex-col md:flex-row md:items-center justify-between">
                                        <div className="flex-grow pr-8">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <span className="font-mono text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                    {item.templateCode}
                                                </span>
                                                <span className="text-slate-300">/</span>
                                                <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                                                    Version {item.versionNumber}
                                                </span>
                                            </div>
                                            <h2 className="text-lg font-bold text-slate-800 mb-1">{item.templateName}</h2>
                                            {item.changeNotes && (
                                                <p className="text-xs text-slate-500 italic line-clamp-1 mb-2">"{item.changeNotes}"</p>
                                            )}
                                            <div className="flex items-center space-x-4 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                                <div className="flex items-center">
                                                    <span className="mr-1">Requested By:</span>
                                                    <span className="text-slate-600 font-bold">{item.requestedBy}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-1">On:</span>
                                                    <span className="text-slate-600 font-bold">{new Date(item.requestedAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 md:mt-0 flex items-center space-x-3">
                                            <Link
                                                href={`/templates/${item.templateId}`}
                                                className="bg-slate-800 text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-sm group-hover:bg-blue-600"
                                            >
                                                Open Review
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
