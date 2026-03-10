"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { LabelTemplate } from "@/types/template";
import Link from "next/link";

export default function TemplateDetailPage() {
    const { id } = useParams();
    const [template, setTemplate] = useState<LabelTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch<LabelTemplate>(`/api/Templates/${id}`);
                if (res.success && res.data) {
                    setTemplate(res.data);
                }
            } catch (err) {
                console.error("Failed to load template", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!template) return <div className="p-8">Template not found.</div>;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                    <Link href="/templates" className="hover:text-blue-600">Templates</Link>
                    <span>/</span>
                    <span>{template.code}</span>
                </div>

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
                        <p className="text-gray-600 font-mono">{template.code}</p>
                    </div>
                    <div className="flex space-x-4">
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <button className="bg-white border text-gray-700 px-4 py-2 rounded hover:bg-gray-50">
                                Edit Details
                            </button>
                        </RoleGuard>
                        <RoleGuard allowedRoles={["Admin", "Operator"]}>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                New Version
                            </button>
                        </RoleGuard>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700">Active Version Layout (JSON Placeholder)</h3>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">
                                    PUBLISHED
                                </span>
                            </div>
                            <div className="p-6">
                                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto h-64">
                                    {template.currentActiveVersionId
                                        ? template.versions?.find(v => v.id === template.currentActiveVersionId)?.layoutJson
                                        : "// No active version layout available"}
                                </pre>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white border rounded-lg p-6 shadow-sm">
                            <h3 className="font-semibold text-gray-700 mb-4">Version History</h3>
                            <div className="space-y-4">
                                {template.versions?.map((v) => (
                                    <div key={v.id} className="border-l-2 border-blue-500 pl-4 py-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm">Version {v.versionNumber}</span>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${v.status === 'Published' ? 'bg-green-100 text-green-800' :
                                                    v.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {v.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">
                                            Created {new Date(v.createdAt).toLocaleDateString()} by {v.createdBy}
                                        </p>
                                        {v.changeNotes && (
                                            <p className="text-xs italic text-gray-600">"{v.changeNotes}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 border rounded-lg p-6">
                            <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                            <p className="text-sm text-gray-600">
                                {template.description || "No description provided for this template."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
