"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { LabelTemplate } from "@/types/template";
import Link from "next/link";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch<LabelTemplate[]>("/api/Templates");
                if (res.success && res.data) {
                    setTemplates(res.data);
                }
            } catch (err) {
                console.error("Failed to load templates", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8 max-w-7xl mx-auto">
                {/* Action Header */}
                <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Label Templates</h1>
                        <p className="text-sm text-slate-500 mt-1">Design and manage canonical label models and version governance.</p>
                    </div>
                    <RoleGuard allowedRoles={["Admin", "Operator"]}>
                        <button className="bg-slate-800 text-white px-4 py-2 rounded font-semibold hover:bg-slate-900 shadow-sm transition-colors text-sm">
                            New Template
                        </button>
                    </RoleGuard>
                </div>

                {/* Filters */}
                <div className="mb-6 flex justify-between items-center">
                    <div className="relative w-full max-w-sm">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search by Code or Name..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-slate-500 font-medium">Loading Templates...</span>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Code</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Template Name</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Version</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Compliance</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Last Update</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredTemplates.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                            No templates found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTemplates.map((t) => (
                                        <tr
                                            key={t.id}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                            onClick={() => window.location.href = `/templates/${t.id}`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    {t.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                                                <div className="text-[11px] text-slate-400 truncate max-w-xs">{t.description || "No description."}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {t.currentActiveVersion ? (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                        <span className="text-sm font-bold text-slate-700">V{t.currentActiveVersion.versionNumber}</span>
                                                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Published</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                                        <span className="text-xs text-slate-400 italic font-medium">No Active Version</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-slate-200">
                                                    PDF-ONLY
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right font-mono text-[11px]">
                                                {new Date(t.updatedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}

