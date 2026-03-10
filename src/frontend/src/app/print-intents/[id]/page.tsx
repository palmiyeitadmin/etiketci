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
        if (!confirm("Are you sure you want to confirm manual handoff?")) return;

        try {
            const res = await apiFetch(`/api/PrintIntents/${id}/handoff`, { method: 'POST' });
            if (res.success) {
                alert("Intent marked ready for manual handoff.");
                loadIntent(); // refresh state
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
                alert("Intent cancelled.");
                loadIntent(); // refresh state
            } else {
                alert("Cancellation failed: " + ((res as any).error?.message || "Unknown error"));
            }
        } catch (err) {
            alert("An error occurred during cancellation.");
        }
    };

    if (loading) return <div className="p-8">Loading Intent Shell...</div>;
    if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>;
    if (!intent) return <div className="p-8">Intent not found.</div>;

    const isPending = intent.status === "Pending";
    const isReadyForPrint = intent.status === "ReadyForPrint";
    const isCancelled = intent.status === "Cancelled";

    const isSafeToHandoff = intent.safetyCheck?.isSafe;
    const readinessSnapshot = intent.readinessSnapshot ? JSON.parse(intent.readinessSnapshot) : null;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="max-w-5xl mx-auto p-8 space-y-6">

                {/* Header */}
                <div className="flex justify-between items-start border-b pb-6">
                    <div>
                        <h1 className="text-2xl font-bold font-mono tracking-tight text-gray-900">
                            OPERATOR HANDOFF SHELL
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Intent ID: <span className="font-mono">{intent.id}</span></p>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                        <span className={`px-4 py-2 rounded font-bold uppercase tracking-widest text-sm border ${isPending ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            isReadyForPrint ? 'bg-green-100 text-green-800 border-green-300' :
                                'bg-gray-100 text-gray-800 border-gray-300'
                            }`}>
                            STATUS: {intent.status}
                        </span>
                        {isReadyForPrint && intent.operatorReviewedBy && (
                            <span className="text-xs text-green-700 italic">
                                Reviewed by {intent.operatorReviewedBy} at {new Date(intent.operatorReviewedAt!).toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-3 gap-6">

                    {/* Left Column: Context */}
                    <div className="col-span-2 space-y-6">

                        {/* Context Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white border rounded p-4 shadow-sm">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b pb-1">Product Context</h3>
                                <div className="text-lg font-bold text-blue-900 leading-tight">{intent.productName}</div>
                            </div>
                            <div className="bg-white border rounded p-4 shadow-sm">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 border-b pb-1">Template Target</h3>
                                <div className="text-sm font-bold text-gray-800">{intent.templateName}</div>
                                <div className="text-xs text-gray-500 font-mono mt-1">Version: {intent.versionNumber}</div>
                            </div>
                        </div>

                        {/* Final Safety Check Panel */}
                        <div className={`border rounded shadow-sm overflow-hidden ${intent.safetyCheck?.status === 0 ? 'bg-green-50 border-green-200' :
                            intent.safetyCheck?.status === 1 ? 'bg-amber-50 border-amber-200' :
                                'bg-red-50 border-red-200'
                            }`}>
                            <div className="px-4 py-3 bg-white/50 border-b font-bold tracking-wide uppercase text-sm">
                                Final Safety Check
                                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] text-white ${intent.safetyCheck?.status === 0 ? 'bg-green-600' :
                                    intent.safetyCheck?.status === 1 ? 'bg-amber-600' :
                                        'bg-red-600'
                                    }`}>
                                    {intent.safetyCheck?.status === 0 ? 'READY' : intent.safetyCheck?.status === 1 ? 'WARNING' : 'BLOCKED'}
                                </span>
                            </div>
                            <div className="p-4">
                                {intent.safetyCheck?.messages && intent.safetyCheck.messages.length > 0 ? (
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
                                        {intent.safetyCheck.messages.map((m, i) => (
                                            <li key={i}>{m}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-green-800 italic">All safety and readiness checks passed.</p>
                                )}
                            </div>
                        </div>

                        {/* Readiness Snapshot History */}
                        <div className="bg-white border rounded shadow-sm">
                            <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Original Readiness Snapshot</h3>
                                <span className="text-[10px] text-gray-400">Captured at {new Date(intent.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="p-4">
                                {readinessSnapshot ? (
                                    <div className="space-y-4">
                                        <div className="flex space-x-2 text-xs">
                                            <span className="font-bold uppercase">Initial Status:</span>
                                            <span className={`${readinessSnapshot.Status === 0 ? 'text-green-600' :
                                                readinessSnapshot.Status === 1 ? 'text-amber-600' :
                                                    'text-red-600'
                                                }`}>
                                                {readinessSnapshot.Status === 0 ? 'Ready' : readinessSnapshot.Status === 1 ? 'Warning' : 'Blocked'}
                                            </span>
                                        </div>
                                        {readinessSnapshot.Errors && readinessSnapshot.Errors.length > 0 && (
                                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                                <strong>Original Blockers:</strong>
                                                <ul className="list-disc pl-4 mt-1">
                                                    {readinessSnapshot.Errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {readinessSnapshot.Warnings && readinessSnapshot.Warnings.length > 0 && (
                                            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                                                <strong>Original Warnings:</strong>
                                                <ul className="list-disc pl-4 mt-1">
                                                    {readinessSnapshot.Warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No snapshot available.</p>
                                )}
                            </div>
                        </div>

                        {/* Audit History */}
                        <div className="bg-white border rounded shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Audit History</h3>
                                <span className="text-[10px] text-gray-400">Strict chronological history</span>
                            </div>
                            <div className="p-4 bg-gray-50/50">
                                {auditLogs.length > 0 ? (
                                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
                                        {auditLogs.map((log, index) => (
                                            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-[0px]">
                                                    <span className="w-2 h-2 rounded-full bg-white"></span>
                                                </div>
                                                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border bg-white shadow-sm flex flex-col space-y-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-xs uppercase text-gray-800">{log.action}</span>
                                                        <span className="text-[9px] text-gray-400 font-mono tracking-tighter">{new Date(log.timestamp).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600 leading-tight">{log.details}</p>
                                                    <div className="text-[10px] text-blue-600 font-medium italic">Actor: {log.userId}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic text-center py-4">No audit history available for this print intent.</p>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Actons & Guidance */}
                    <div className="space-y-6">

                        <div className="bg-white border rounded shadow-sm">
                            <div className="px-4 py-3 border-b bg-gray-50">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Intent Parameters</h3>
                            </div>
                            <div className="p-6 flex flex-col items-center justify-center space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Quantity</span>
                                <span className="text-5xl font-black text-blue-600">{intent.quantity}</span>
                                <span className="text-xs text-gray-500 uppercase">Labels</span>
                            </div>
                        </div>

                        {/* Action Panel */}
                        <div className="bg-white border rounded shadow-sm border-blue-200">
                            <div className="px-4 py-3 border-b bg-blue-50 border-blue-100">
                                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest">Operator Actions</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                <button
                                    className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded hover:bg-gray-50 text-sm"
                                    onClick={() => window.open(`/api/Templates/${intent.templateId}/versions/${intent.versionId}/preview?productId=${intent.productId}`, '_blank')}
                                >
                                    View PDF Proof
                                </button>

                                {isPending && (
                                    <>
                                        <button
                                            className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-colors"
                                            disabled={!isSafeToHandoff}
                                            onClick={handleHandoff}
                                        >
                                            Confirm Handoff
                                        </button>

                                        {!isSafeToHandoff && (
                                            <p className="text-[10px] text-red-500 italic text-center leading-tight">
                                                Handoff disabled. Safety check failed.
                                            </p>
                                        )}
                                    </>
                                )}

                                {(isPending || isReadyForPrint) && (
                                    <button
                                        className="w-full bg-white border border-red-300 text-red-600 font-bold py-2 rounded hover:bg-red-50 text-sm mt-4"
                                        onClick={handleCancel}
                                    >
                                        Cancel Intent
                                    </button>
                                )}

                                {isReadyForPrint && (
                                    <div className="bg-indigo-50 p-4 rounded border-2 border-indigo-300 text-center mt-4">
                                        <div className="flex items-center justify-center space-x-2 mb-2">
                                            <span className="flex h-3 w-3 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                            </span>
                                            <span className="text-sm font-black text-indigo-900 tracking-tight uppercase">Ready for Operator Handoff</span>
                                        </div>
                                        <span className="text-xs font-bold text-indigo-800 leading-tight block uppercase tracking-widest border-t border-indigo-200 pt-2 mt-2">
                                            Prepared PDF available for manual print handling.
                                        </span>
                                        <span className="text-[10px] text-indigo-700 block mt-1">
                                            Awaiting manual print action by operator. Actual print execution is not performed by PLMS.
                                        </span>
                                    </div>
                                )}

                                {isCancelled && (
                                    <div className="bg-red-50 p-3 rounded border border-red-200 text-center">
                                        <span className="text-sm font-bold text-red-800">Intent Cancelled</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Guidance */}
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-4 text-xs text-gray-600">
                            <strong>Operator Guidance:</strong>
                            <ul className="list-disc pl-4 mt-2 space-y-1">
                                <li>Always verify the PDF Proof against the physical label stock.</li>
                                <li>Ensure "Actual Size" is selected if printing manually.</li>
                                <li>If warnings exist, consult a Reviewer before approving handoff.</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
