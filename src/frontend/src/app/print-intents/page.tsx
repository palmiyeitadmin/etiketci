"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { PrintIntentDto } from "@/types/operational";
import Link from "next/link";

export default function PrintIntentsPage() {
    const [intents, setIntents] = useState<PrintIntentDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch<PrintIntentDto[]>("/api/PrintIntents");
                if (res.success && res.data) {
                    setIntents(res.data);
                }
            } catch (err) {
                console.error("Failed to load print intents", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const readyCount = intents.filter(i => i.status === 'ReadyForPrint').length;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8 max-w-7xl mx-auto">
                
                {/* Enterprise Navigation Header */}
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                            <span>Operations</span>
                            <span className="text-slate-200">/</span>
                            <span className="text-slate-900">Intent Registry</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Print Queue</h1>
                        <p className="text-slate-500 font-medium mt-2">Active print intentions and operator handoff synchronization.</p>
                    </div>
                </div>

                {/* Operational Intelligence */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-emerald-900 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 font-black text-4xl text-white italic transition-transform group-hover:scale-110">READY</div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Awaiting Handoff</span>
                        <div className="flex items-baseline space-x-2 mt-4">
                            <span className="text-3xl font-black text-white">{readyCount}</span>
                            <span className="text-xs font-bold text-emerald-400">BATCHES</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Lifecycle Intents</span>
                        <div className="flex items-baseline space-x-2 mt-4">
                            <span className="text-3xl font-black text-slate-900">{intents.length}</span>
                            <span className="text-xs font-bold text-slate-400">CAPTURED</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Efficiency</span>
                        <div className="flex items-baseline space-x-2 mt-4">
                            <span className="text-3xl font-black text-slate-900">100%</span>
                            <span className="text-xs font-bold text-slate-400">UPTIME</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Queue...</div>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Subject</th>
                                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Aesthetic Map</th>
                                    <th className="px-8 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Quantity</th>
                                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Flux</th>
                                    <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Actor</th>
                                    <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                                    <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {intents.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-4xl mb-4 opacity-30 italic">∅</span>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">
                                                    No operational intents discovered.<br/>
                                                    Capture new intentions via the Product Catalog.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    intents.map((intent) => (
                                        <tr key={intent.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => window.location.href=`/print-intents/${intent.id}`}>
                                            <td className="px-8 py-5">
                                                <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{intent.productName}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{intent.templateName}</div>
                                                <div className="text-[9px] font-mono text-slate-400 mt-0.5">VER_SH_0{intent.versionNumber}</div>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-center">
                                                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{intent.quantity}</span>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border inline-flex items-center space-x-1.5 ${
                                                    intent.status === 'ReadyForPrint' 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                        : intent.status === 'Cancelled'
                                                        ? 'bg-red-50 text-red-700 border-red-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    <span className={`w-1 h-1 rounded-full ${intent.status === 'ReadyForPrint' ? 'bg-emerald-500' : intent.status === 'Cancelled' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                                    <span>{intent.status === 'ReadyForPrint' ? 'READY_HANDOFF' : intent.status.toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">
                                                {intent.requestedBy}
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-[10px] font-black text-slate-400 text-right font-mono">
                                                {new Date(intent.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-right">
                                                <Link
                                                    href={`/print-intents/${intent.id}`}
                                                    className="text-slate-900 font-black text-[10px] uppercase tracking-widest decoration-slate-200 underline underline-offset-4 hover:text-blue-600 transition-colors"
                                                >
                                                    Open Shell
                                                </Link>
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

