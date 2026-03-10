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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${intent.status === 'ReadyForPrint' ? 'bg-green-100 text-green-800' :
                                                    intent.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                        intent.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {intent.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{intent.requestedBy}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(intent.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link
                                                    href={`/print-intents/${intent.id}`}
                                                    className="text-blue-600 hover:text-blue-900 font-bold"
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
