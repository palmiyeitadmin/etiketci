"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { LabelTemplate } from "@/types/template";
import Link from "next/link";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Label Templates</h1>
                    <RoleGuard allowedRoles={["Admin", "Operator"]}>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            New Template
                        </button>
                    </RoleGuard>
                </div>

                {loading ? (
                    <p>Loading templates...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.length === 0 ? (
                            <p className="col-span-full text-center text-gray-500 italic py-10 border-2 border-dashed rounded-lg">
                                No templates found.
                            </p>
                        ) : (
                            templates.map((t) => (
                                <Link
                                    key={t.id}
                                    href={`/templates/${t.id}`}
                                    className="block bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-xl font-semibold">{t.name}</h2>
                                        <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded">
                                            {t.code}
                                        </span>
                                    </div>

                                    <div className="flex items-center space-x-2 mb-4">
                                        <span className={`w-3 h-3 rounded-full ${t.currentActiveVersion ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                        <span className="text-sm text-gray-600">
                                            {t.currentActiveVersion
                                                ? `Published V${t.currentActiveVersion.versionNumber}`
                                                : "No Active Version"}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                        {t.description || "No description provided."}
                                    </p>

                                    <div className="text-xs text-gray-400 mt-auto">
                                        Updated {new Date(t.updatedAt).toLocaleDateString()}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
