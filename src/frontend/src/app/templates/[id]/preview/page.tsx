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
}

export default function TemplatePreviewPage() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const versionId = searchParams.get("versionId");

    const [metadata, setMetadata] = useState<TemplatePreviewMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!id || !versionId) return;

        const load = async () => {
            try {
                const res = await apiFetch<TemplatePreviewMetadata>(`/api/Templates/${id}/versions/${versionId}/preview-metadata`);
                if (res.success && res.data) {
                    setMetadata(res.data);
                }

                // Construct PDF URL
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5031";
                setPdfUrl(`${baseUrl}/api/Templates/${id}/versions/${versionId}/preview`);
            } catch (err) {
                console.error("Failed to load preview metadata", err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id, versionId]);

    const handleDownload = () => {
        if (!pdfUrl) return;
        window.open(pdfUrl, '_blank');
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
                            onClick={handleDownload}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
                        >
                            Download PDF
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-80 bg-white border-r overflow-y-auto p-6 space-y-8">
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
                                    <span className="text-gray-500">Created At:</span>
                                    <span>{new Date(metadata.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Created By:</span>
                                    <span>{metadata.createdBy}</span>
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

                        <section className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notice</h3>
                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                This preview is generated from the current canonical model.
                                Printing results depend on the specific printer resolution and settings.
                                Ensure "Actual Size" is selected in the print dialog.
                            </p>
                        </section>
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
