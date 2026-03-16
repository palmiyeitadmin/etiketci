"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { PrintIntentDetailDto } from "@/types/operational";
import { AuditLogDto } from "@/types/audit";
import Link from "next/link";

export default function PrintIntentHandoffPage() {
    const { id } = useParams();
    const router = useRouter();

    const [intent, setIntent] = useState<PrintIntentDetailDto | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadIntent = async () => {
        try {
            const res = await apiFetch<PrintIntentDetailDto>(`/api/PrintIntents/${id}`);
            if (res.success && res.data) {
                setIntent(res.data);

                // Fetch audit logs conditionally when intent loads
                const auditRes = await apiFetch<AuditLogDto[]>(`/api/PrintIntents/${id}/audit`);
                if (auditRes.success && auditRes.data) {
                    setAuditLogs(auditRes.data);
                }
            } else {
                setError((res as any).error?.message || "Failed to load intent.");
            }
        } catch (err) {
            setError("An error occurred while loading the print intent.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) loadIntent();
    }, [id]);

    const handleHandoff = async () => {
        if (!confirm("Confirm manual handoff preparation? This will finalize the audit period for this intent.")) return;

        try {
            const res = await apiFetch(`/api/PrintIntents/${id}/handoff`, { method: 'POST' });
            if (res.success) {
                await loadIntent();
            } else {
                alert("Handoff failed: " + ((res as any).error?.message || "Unknown error"));
            }
        } catch (err) {
            alert("An error occurred during handoff.");
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this print intent?")) return;

        try {
            const res = await apiFetch(`/api/PrintIntents/${id}/cancel`, { method: 'POST' });
            if (res.success) {
                await loadIntent();
            } else {
                alert("Cancellation failed: " + ((res as any).error?.message || "Unknown error"));
            }
        } catch (err) {
            alert("An error occurred during cancellation.");
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-900">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
        </div>
    );
    if (error) return <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-[2rem] font-black uppercase tracking-widest">{error}</div>;
    if (!intent) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Intent Void: Record Not Located.</div>;

    const isPending = intent.status === "Pending";
    const isReadyForPrint = intent.status === "ReadyForPrint";
    const isCancelled = intent.status === "Cancelled";

    const isSafeToHandoff = intent.safetyCheck?.isSafe;
    const readinessSnapshot = intent.readinessSnapshot ? JSON.parse(intent.readinessSnapshot) : null;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="max-w-6xl mx-auto p-8 space-y-10">

                {/* Industrial Header & Control Status */}
                <div className="bg-slate-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute right-[-40px] top-[-40px] font-black text-[100px] text-white/5 italic select-none pointer-events-none tracking-tighter uppercase">Status</div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-6">
                            <Link href="/print-intents" className="hover:text-blue-400 transition-colors">Registry</Link>
                            <span>/</span>
                            <span className="text-white font-mono">{intent.id}</span>
                        </div>

                        <div className="flex justify-between items-start">
                            <div className="space-y-4">
                                <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Intent detail shell</h1>
                                <p className="text-white/50 text-xs font-bold uppercase tracking-widest italic">Manual preparation and handoff</p>
                            </div>

                            <div className="flex flex-col items-end space-y-2">
                                <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg ${
                                    isPending ? 'bg-amber-500 text-white border-amber-400' :
                                    isReadyForPrint ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20' :
                                    'bg-slate-700 text-slate-400 border-slate-600'
                                }`}>
                                    STATUS: {intent.status.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '')}
                                </div>
                                {isReadyForPrint && intent.operatorReviewedBy && (
                                    <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-2 flex items-center">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></span>
                                        VERIFIED BY {intent.operatorReviewedBy}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* Operational Integrity & Snapshot */}
                    <div className="lg:col-span-2 space-y-8">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Operational Context</h3>
                                <div className="text-xl font-black text-slate-900 tracking-tight uppercase leading-tight mb-2">{intent.productName}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Product Focus</div>
                            </section>

                            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Template Destination</h3>
                                <div className="text-md font-black text-slate-900 leading-tight uppercase mb-1">{intent.templateName}</div>
                                <div className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">AESTHETIC_V0{intent.versionNumber}</div>
                            </section>
                        </div>

                        {/* Safety Diagnostics */}
                        <section className={`rounded-[2rem] overflow-hidden border-2 shadow-sm ${
                            intent.safetyCheck?.status === 0 ? 'bg-emerald-50 border-emerald-100' :
                            intent.safetyCheck?.status === 1 ? 'bg-amber-50 border-amber-100' :
                            'bg-red-50 border-red-100'
                        }`}>
                            <div className="px-8 py-5 bg-white/50 border-b border-inherit flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Integrity Diagnostic</h3>
                                <div className={`text-[9px] font-black px-3 py-1 rounded-full text-white tracking-[0.2em] ${
                                    intent.safetyCheck?.status === 0 ? 'bg-emerald-600' :
                                    intent.safetyCheck?.status === 1 ? 'bg-amber-600' :
                                    'bg-red-600'
                                }`}>
                                    {intent.safetyCheck?.status === 0 ? 'NOMINAL' : intent.safetyCheck?.status === 1 ? 'CAUTION' : 'CRITICAL_BLOCK'}
                                </div>
                            </div>
                            <div className="p-8">
                                {intent.safetyCheck?.messages && intent.safetyCheck.messages.length > 0 ? (
                                    <ul className="space-y-3">
                                        {intent.safetyCheck.messages.map((m, i) => (
                                            <li key={i} className="flex items-start">
                                                <span className={`w-1.5 h-1.5 rounded-full mt-1 mr-3 shrink-0 ${
                                                    intent.safetyCheck?.status === 0 ? 'bg-emerald-400' : 'bg-red-400'
                                                }`}></span>
                                                <p className="text-xs font-bold text-slate-700 uppercase tracking-tight leading-relaxed">{m}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs font-black text-emerald-700 uppercase tracking-widest italic animate-pulse">✓ All readiness parameters verified within safety tolerance.</p>
                                )}
                            </div>
                        </section>

                        {/* Audit Log Visualization */}
                        <section className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                            <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Audit Chain history</h3>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Immutable Traceability</span>
                            </div>
                            <div className="p-8 bg-slate-50/20">
                                {auditLogs.length > 0 ? (
                                    <div className="space-y-6">
                                        {auditLogs.map((log) => (
                                            <div key={log.id} className="relative pl-8 before:absolute before:left-[7px] before:top-2 before:bottom-[-24px] before:w-px before:bg-slate-200 last:before:hidden">
                                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-slate-100 bg-white shadow-sm flex items-center justify-center">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                </div>
                                                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm group hover:border-blue-200 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{log.action}</span>
                                                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed mb-3">{log.details}</p>
                                                    <div className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded inline-block uppercase tracking-[0.2em]">ACTOR: {log.userId}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center uppercase text-[10px] font-black text-slate-300 tracking-widest italic">Chain of custody initialization in progress.</div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Operational Commands */}
                    <div className="space-y-8">
                        
                        <section className="bg-slate-50 border border-slate-200 rounded-[2rem] p-10 text-center">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Output Intensity</h3>
                            <div className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums leading-none mb-2">{intent.quantity}</div>
                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Standard Units</div>
                        </section>

                        <section className="bg-white border-2 border-blue-100 rounded-[2rem] p-8 shadow-xl space-y-6">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-50 pb-3">Operational Command</h3>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl hover:bg-slate-100 transition-all"
                                    onClick={() => window.open(`/api/Templates/${intent.templateId}/versions/${intent.versionId}/preview?productId=${intent.productId}`, '_blank')}
                                >
                                    Review PDF Proof
                                </button>

                                {isPending && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <button
                                            className="w-full bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-slate-800 disabled:opacity-20 disabled:grayscale transition-all shadow-xl shadow-slate-200 disabled:shadow-none"
                                            disabled={!isSafeToHandoff}
                                            onClick={handleHandoff}
                                        >
                                            Confirm Handoff
                                        </button>
                                        {!isSafeToHandoff && (
                                            <div className="text-[9px] font-black text-red-500 uppercase tracking-widest text-center italic animate-pulse px-4">
                                                Command Lock: Integrity violation detected
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isReadyForPrint && (
                                    <div className="bg-emerald-900 rounded-[2rem] p-8 text-center text-white space-y-4 shadow-xl">
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 font-mono">STANDBY_HANDOFF</span>
                                        </div>
                                        <div className="text-xs font-bold leading-relaxed italic text-emerald-100/80">
                                            Master record prepared for manual output handler. Intent locked for audit.
                                        </div>
                                        <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest pt-2 opacity-50">
                                            PLMS: Manual Flow Active
                                        </div>
                                    </div>
                                )}

                                {(isPending || isReadyForPrint) && (
                                    <button
                                        className="w-full text-red-400 font-black text-[9px] uppercase tracking-widest py-4 hover:text-red-600 transition-colors"
                                        onClick={handleCancel}
                                    >
                                        Void Intention
                                    </button>
                                )}

                                {isCancelled && (
                                    <div className="bg-red-50 rounded-2xl py-4 border border-red-100 text-center">
                                        <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">RECORD_VOIDED</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="bg-slate-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                             <div className="absolute right-[-20px] bottom-[-20px] font-black text-6xl text-white/5 italic">DOCS</div>
                             <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center">
                                 <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></span>
                                 System Guidance
                             </h4>
                             <ul className="space-y-5">
                                 <li className="flex items-start">
                                     <span className="text-blue-500 font-black text-xs mr-3">01</span>
                                     <p className="text-[10px] font-bold text-white/70 uppercase tracking-tight leading-loose italic">Verify proof aesthetics against target substrate.</p>
                                 </li>
                                 <li className="flex items-start">
                                     <span className="text-blue-500 font-black text-xs mr-3">02</span>
                                     <p className="text-[10px] font-bold text-white/70 uppercase tracking-tight leading-loose italic">Confirm "Actual Size" is engaged in output handler.</p>
                                 </li>
                                 <li className="flex items-start">
                                     <span className="text-blue-500 font-black text-xs mr-3">03</span>
                                     <p className="text-[10px] font-bold text-white/70 uppercase tracking-tight leading-loose italic">Consult Reviewer for Caution level diagnostics.</p>
                                 </li>
                             </ul>
                        </section>

                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}

