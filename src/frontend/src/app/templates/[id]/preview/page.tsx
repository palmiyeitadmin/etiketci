"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import Link from "next/link";

interface VariableResolutionDetail {
    name: string;
    status: number; // 0=Resolved, 1=Missing, 2=Unsupported
    resolvedValue?: string;
}

interface TemplatePreviewMetadata {
    templateId: string;
    templateName: string;
    templateCode: string;
    versionId: string;
    versionNumber: number;
    status: string;
    createdAt: string;
    createdBy: string;
    warnings: string[];
    requiredVariables: string[];
    hasProductContext: boolean;
    productName?: string;
    productSku?: string;
    readinessStatus: number; // 0=Ready, 1=Warning, 2=Blocked
    readinessErrors: string[];
    variableDetails: VariableResolutionDetail[];
}

export default function TemplatePreviewPage() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const versionId = searchParams.get("versionId");
    const productId = searchParams.get("productId");

    const [metadata, setMetadata] = useState<TemplatePreviewMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!id || !versionId) return;

        const load = async () => {
            try {
                const query = productId ? `?productId=${productId}` : "";
                const res = await apiFetch<TemplatePreviewMetadata>(`/api/Templates/${id}/versions/${versionId}/preview-metadata${query}`);
                if (res.success && res.data) {
                    setMetadata(res.data);
                }

                // Construct PDF URL
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5031";
                setPdfUrl(`${baseUrl}/api/Templates/${id}/versions/${versionId}/preview${query}`);
            } catch (err) {
                console.error("Failed to load preview metadata", err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id, versionId, productId]);

    const handleCreateIntent = async () => {
        if (!metadata || !productId) return;

        if (metadata.readinessStatus === 2) {
            return; // UI should disable button anyway
        }

        const qtyStr = prompt("Enter print quantity:", "1");
        if (qtyStr === null) return;
        const quantity = parseInt(qtyStr);
        if (isNaN(quantity) || quantity <= 0) {
            alert("Invalid quantity.");
            return;
        }

        try {
            const res = await apiFetch(`/api/PrintIntents`, {
                method: 'POST',
                body: JSON.stringify({
                    productId: productId,
                    templateId: id,
                    versionId: versionId,
                    quantity
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.success) {
                router.push('/print-intents');
            } else {
                alert("Failed to create print intent: " + ((res as any).error || "Unknown error"));
            }
        } catch (err) {
            console.error("Error creating print intent", err);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-4"></div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Rendering PDF Engine</div>
            </div>
        </div>
    );

    if (!metadata) return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">Metadata context loss.</div>;

    const isBlocked = metadata.readinessStatus === 2;
    const hasWarnings = metadata.readinessStatus === 1 || metadata.warnings.length > 0;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
                {/* Enterprise Header */}
                <div className="bg-slate-900 text-white border-b border-white/5 px-8 h-20 flex justify-between items-center shrink-0 shadow-2xl z-10">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all group"
                        >
                            <span className="text-white/50 group-hover:text-white transition-colors">←</span>
                        </button>
                        <div className="border-l border-white/10 pl-6">
                            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">{metadata.templateName}</h1>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">{metadata.templateCode}</span>
                                <span className="text-white/20 text-[10px]">|</span>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Version {metadata.versionNumber}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] flex items-center space-x-2 ${
                            isBlocked ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            hasWarnings ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                            "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isBlocked ? "bg-red-500" : hasWarnings ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                            <span>{isBlocked ? "Production Blocked" : hasWarnings ? "Ready with Warnings" : "Readiness: PASS"}</span>
                        </div>
                        
                        <div className="h-8 w-px bg-white/10 mx-2"></div>

                        {productId && (
                            <button
                                onClick={handleCreateIntent}
                                disabled={isBlocked}
                                className={`px-6 py-2.5 rounded font-black text-[11px] uppercase tracking-widest transition-all shadow-lg ${
                                    isBlocked 
                                    ? "bg-slate-700 text-slate-500 cursor-not-allowed border border-white/5" 
                                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/40"
                                }`}
                            >
                                {isBlocked ? "System Lock: Check Errors" : "Confirm for Operator Handoff"}
                            </button>
                        )}
                        <button
                            onClick={() => { if (pdfUrl) window.open(pdfUrl, '_blank'); }}
                            className="bg-white/5 text-white/70 px-4 py-2.5 rounded font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/10"
                        >
                            Export PDF
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Industrial Sidebar */}
                    <div className="w-[400px] bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar shadow-inner select-none flex flex-col">
                        
                        {/* Status Guard Section */}
                        <div className={`p-8 border-b-2 flex flex-col space-y-4 ${
                            isBlocked ? "bg-red-50/50 border-red-100" :
                            hasWarnings ? "bg-amber-50/50 border-amber-100" :
                            "bg-emerald-50/50 border-emerald-100"
                        }`}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Diagnostic</h3>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                                    isBlocked ? "text-red-700 border-red-200 bg-red-100" :
                                    hasWarnings ? "text-amber-700 border-amber-200 bg-amber-100" :
                                    "text-emerald-700 border-emerald-200 bg-emerald-100"
                                }`}>
                                    {isBlocked ? "CRITICAL" : hasWarnings ? "CAUTION" : "VERIFIED"}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {isBlocked && metadata.readinessErrors.map((err, i) => (
                                    <div key={i} className="flex space-x-3 items-start p-3 bg-red-100/50 rounded-lg border border-red-100">
                                        <span className="text-red-600 text-xs">✕</span>
                                        <p className="text-[11px] font-bold text-red-900 leading-tight">{err}</p>
                                    </div>
                                ))}
                                {!isBlocked && hasWarnings && (
                                    <div className="flex space-x-3 items-start p-3 bg-amber-100/50 rounded-lg border border-amber-100">
                                        <span className="text-amber-600 text-xs">!</span>
                                        <p className="text-[11px] font-bold text-amber-900 leading-tight">Visual artifacts or missing non-critical data detected.</p>
                                    </div>
                                )}
                                {!isBlocked && !hasWarnings && (
                                    <p className="text-[11px] font-medium text-emerald-800 italic">Layout engine reports 100% resolution for production variables.</p>
                                )}
                            </div>
                        </div>

                        {/* Attribute Groups */}
                        <div className="p-8 space-y-10">
                            
                            {/* Product Context */}
                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
                                    Operational Context
                                </h4>
                                {metadata.hasProductContext ? (
                                    <div className="bg-slate-900 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                                        <div className="absolute right-[-10px] top-[-10px] font-black text-4xl text-white/5 italic select-none">DATA</div>
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Target Product</div>
                                        <div className="text-lg font-black text-white uppercase tracking-tighter leading-tight">{metadata.productName}</div>
                                        <div className="mt-2 flex items-center space-x-2">
                                            <span className="text-[10px] font-mono text-white/40 tracking-widest">SKU_REF:</span>
                                            <span className="text-[10px] font-mono text-emerald-400 font-bold">{metadata.productSku}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">No Active Product Context</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Variables will remain in placeholder state.</p>
                                    </div>
                                )}
                            </section>

                            {/* Variable Resolution */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                        Variable Resolution
                                    </h4>
                                    <span className="text-[9px] font-black text-slate-300">
                                        {metadata.variableDetails.length} FOUND
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {metadata.variableDetails.length === 0 ? (
                                        <div className="text-[11px] text-slate-400 italic font-medium p-4 bg-slate-50 rounded-lg">Static layout - No variables defined.</div>
                                    ) : (
                                        metadata.variableDetails.map(varDetail => (
                                            <div key={varDetail.name} className={`p-3 rounded-lg border transition-all ${
                                                varDetail.status === 0 ? "bg-white border-slate-200 hover:border-emerald-200" :
                                                "bg-red-50 border-red-100"
                                            }`}>
                                                <div className="flex items-start justify-between mb-1.5">
                                                    <span className="font-mono text-[10px] font-black text-slate-900">{"{{"}{varDetail.name}{"}}"}</span>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                                                        varDetail.status === 0 ? "text-emerald-700 border-emerald-100 bg-emerald-50" :
                                                        "text-red-700 border-red-100 bg-red-100"
                                                    }`}>
                                                        {varDetail.status === 0 ? "Resolved" : "Missing"}
                                                    </span>
                                                </div>
                                                {varDetail.status === 0 ? (
                                                    <div className="text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded truncate border border-slate-100">
                                                        {varDetail.resolvedValue}
                                                    </div>
                                                ) : (
                                                    <div className="text-[9px] font-black text-red-600 uppercase tracking-widest italic decoration-red-300 decoration-wavy underline">
                                                        Resolution Failure
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* System Governance */}
                            <section className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4">Governance Snapshot</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Status</span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                            metadata.status === 'Published' ? 'bg-emerald-900 text-white' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                            {metadata.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-slate-500 uppercase">Publisher</span>
                                        <span className="font-black text-slate-900">{metadata.createdBy}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-slate-500 uppercase">Timestamp</span>
                                        <span className="font-black text-slate-900">{new Date(metadata.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* PDF Engine Canvas */}
                    <div className="flex-1 bg-slate-200 relative overflow-hidden flex items-center justify-center p-12">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                        
                        {pdfUrl ? (
                            <div className="w-full max-w-5xl h-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] bg-white rounded-sm overflow-hidden border border-slate-400">
                                <iframe
                                    src={pdfUrl}
                                    className="w-full h-full"
                                    title="Production PDF Stream"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center animate-pulse">
                                <div className="w-64 h-80 bg-slate-300 rounded-lg mb-6 shadow-inner"></div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Awaiting PDF stream response...</div>
                            </div>
                        )}

                        {/* Zoom/Floating Controls could go here */}
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}

