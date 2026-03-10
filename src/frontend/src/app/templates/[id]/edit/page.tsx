"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { EditorWorkspace } from "@/components/Editor/EditorWorkspace";
import { CanonicalLabelModel } from "@/types/canvas";
import Link from "next/link";

export default function TemplateEditorPage() {
    const { id } = useParams();
    const router = useRouter();
    const [template, setTemplate] = useState<LabelTemplate | null>(null);
    const [editableVersion, setEditableVersion] = useState<TemplateVersion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiFetch<LabelTemplate>(`/api/Templates/${id}`);
                if (res.success && res.data) {
                    setTemplate(res.data);
                    // Find the latest Draft version or most recent version to edit
                    const version = res.data.versions?.find(v => v.status === 'Draft') || res.data.versions?.[0];

                    if (version) {
                        if (version.status !== 'Draft') {
                            // If it's not a draft, user shouldn't be here or we need to prompt "Create Revision"
                            // For now, let's just allow it if it's the only version, but in real flow we'll enforce safety
                            setError("This version is not in Draft state and cannot be edited.");
                        }
                        setEditableVersion(version);
                    }
                }
            } catch (err) {
                setError("Failed to load template for editing.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    const handleSave = async (model: CanonicalLabelModel) => {
        if (!editableVersion) return;

        try {
            const res = await apiFetch(`/api/Templates/${id}/versions/${editableVersion.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    layoutJson: JSON.stringify(model),
                    changeNotes: 'Auto-saved from editor'
                })
            });

            if (res.success) {
                alert("Template saved successfully.");
            } else {
                alert("Failed to save template: " + (res.error as any).message);
            }
        } catch (err) {
            alert("Network error while saving.");
        }
    };

    if (loading) return <div className="p-8">Loading editor...</div>;
    if (error) return (
        <div className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href={`/templates/${id}`} className="text-blue-600 underline">Back to Detail</Link>
        </div>
    );
    if (!template || !editableVersion) return <div className="p-8">Template not found.</div>;

    const initialModel: CanonicalLabelModel = JSON.parse(editableVersion.layoutJson || '{}');
    // Ensure basic model structure if JSON was empty
    if (!initialModel.dimensions) {
        initialModel.dimensions = { widthMm: 100, heightMm: 150 };
        initialModel.elements = initialModel.elements || [];
        initialModel.name = template.name;
        initialModel.version = "1.0";
    }

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="h-screen overflow-hidden">
                <EditorWorkspace
                    initialModel={initialModel}
                    onSave={handleSave}
                />
            </div>
        </RoleGuard>
    );
}
