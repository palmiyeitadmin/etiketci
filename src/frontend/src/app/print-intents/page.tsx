"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { PrintIntentDto } from "@/types/operational";
import Link from "next/link";

export default function PrintIntentsPage() {
    const [intents, setIntents] = useState<PrintIntentDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIntent, setSelectedIntent] = useState<PrintIntentDto | null>(null);

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

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Print Queue Foundation (Intents)</h1>
                </div>

                {loading ? (
                    <p>Loading intents...</p>
                ) : (
                    <div className="overflow-x-auto border rounded-lg shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {intents.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">
                                            No print intents captured yet. Create intents from product pages.
                                        </td>
                                    </tr>
                                ) : (
                                    intents.map((intent) => (
                                        <tr key={intent.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{intent.productName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{intent.templateName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">V{intent.versionNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-blue-600">{intent.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold uppercase">
                                                    {intent.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{intent.requestedBy}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(intent.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => setSelectedIntent(intent)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Audit Log
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Audit Modal */}
                {selectedIntent && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                                <div>
                                    <h2 className="text-lg font-bold">Readiness Audit Log</h2>
                                    <p className="text-xs text-gray-500">Intent ID: {selectedIntent.id}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedIntent(null)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-gray-50 p-3 rounded border">
                                        <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Product</div>
                                        <div className="font-bold">{selectedIntent.productName}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border">
                                        <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Template</div>
                                        <div className="font-bold">{selectedIntent.templateName} (V{selectedIntent.versionNumber})</div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Persisted Readiness Snapshot</h3>
                                    {selectedIntent.readinessSnapshot ? (
                                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                                            <pre>{JSON.stringify(JSON.parse(selectedIntent.readinessSnapshot), null, 2)}</pre>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 italic text-sm p-4 bg-gray-50 rounded border border-dashed">
                                            No readiness snapshot recorded for this intent.
                                        </div>
                                    )}
                                </div>

                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 italic">
                                    This snapshot captures the exact validation state at the moment the print intent was created.
                                </div>
                            </div>
                            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                                <button
                                    onClick={() => setSelectedIntent(null)}
                                    className="bg-white border text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100 text-sm font-bold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
