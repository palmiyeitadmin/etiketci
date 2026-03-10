"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import Link from "next/link";

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
                alert("Print intent created successfully.");
                router.push('/print-intents');
            } else {
                alert("Failed to create print intent: " + ((res as any).error?.message || "Unknown error"));
            }
        } catch (err) {
            alert("Error creating print intent.");
        }
    };

    if (loading) return <div className="p-8">Loading Preview...</div>;
    if (!metadata) return <div className="p-8">Preview metadata not found.</div>;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="h-screen flex flex-col bg-gray-100">
                {/* Header */}
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.back()}
                            className="text-gray-500 hover:text-gray-700 font-bold"
                        >
                            ←
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">{metadata.templateName}</h1>
                            <p className="text-xs text-gray-500 font-mono">{metadata.templateCode} - V{metadata.versionNumber}</p>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => { if (pdfUrl) window.open(pdfUrl, '_blank'); }}
                            className="bg-white border text-gray-700 px-4 py-2 rounded hover:bg-gray-50 text-sm font-medium"
                        >
                            Open in New Tab
                        </button>
                        {productId && (
                            <button
                                onClick={handleCreateIntent}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-bold"
                            >
                                Confirm & Create Intent
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-80 bg-white border-r overflow-y-auto p-6 space-y-8">
                        <section>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Operational Context</h3>
                            {metadata.hasProductContext ? (
                                <div className="bg-blue-50 border border-blue-100 rounded p-3 space-y-2">
                                    <div className="text-[10px] uppercase text-blue-500 font-bold">Linked Product</div>
                                    <div className="text-sm font-bold text-blue-900">{metadata.productName}</div>
                                    <div className="text-xs font-mono text-blue-700">{metadata.productSku}</div>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 italic bg-gray-50 p-3 rounded border border-dashed">
                                    No product context. Variables will not be resolved.
                                </div>
                            )}
                        </section>

                        <section>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Required Variables</h3>
                            {metadata.requiredVariables.length > 0 ? (
                                <div className="space-y-2">
                                    {metadata.requiredVariables.map(v => (
                                        <div key={v} className="flex items-center justify-between text-xs p-2 bg-white border rounded">
                                            <span className="font-mono text-gray-600">{"{{"}{v}{"}}"}</span>
                                            {metadata.hasProductContext ? (
                                                <span className="text-green-600 font-bold">✓</span>
                                            ) : (
                                                <span className="text-gray-300">?</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 italic">No variables found in this template.</p>
                            )}
                        </section>

                        <section>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Version Info</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Status:</span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${metadata.status === 'Published' ? 'bg-green-100 text-green-800' :
                                        metadata.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {metadata.status}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Version:</span>
                                    <span className="font-mono">V{metadata.versionNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Created:</span>
                                    <span>{new Date(metadata.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </section>

                        {metadata.warnings.length > 0 && (
                            <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center">
                                    <span className="mr-1">⚠️</span> Rendering Warnings
                                </h3>
                                <ul className="text-xs text-amber-700 space-y-2 list-disc pl-4">
                                    {metadata.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* PDF Viewer */}
                    <div className="flex-1 p-8 overflow-y-auto flex justify-center bg-gray-200">
                        {pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                className="w-full max-w-4xl h-full bg-white shadow-2xl rounded"
                                title="PDF Preview"
                            />
                        ) : (
                            <div className="text-gray-500 self-center">PDF could not be loaded.</div>
                        )}
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
