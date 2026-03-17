"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { apiFetch } from "@/lib/api-client";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { resolveEditorDraftVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { EditorWorkspace } from "@/components/Editor/EditorWorkspace";
import { CanonicalLabelModel } from "@/types/canvas";
import { normalizeCanonicalLabelModel } from "@/lib/editor-canonical";
import Link from "next/link";

export default function TemplateEditorPage() {
    const { id: routeId } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = String(routeId);
    const requestedVersionId = searchParams.get("versionId");
    const [template, setTemplate] = useState<LabelTemplate | null>(null);
    const [editableVersion, setEditableVersion] = useState<TemplateVersion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await apiFetch<LabelTemplate>(`/api/Templates/${id}`);
                if (res.success && res.data) {
                    const templateData = normalizeLabelTemplate(res.data);
                    const version = await resolveEditorDraftVersion(templateData, requestedVersionId);

                    if (cancelled) {
                        return;
                    }

                    setTemplate(templateData);
                    setEditableVersion(version);
                    setSaveMessage(null);
                    setError(null);

                    if (requestedVersionId !== version.id) {
                        router.replace(`/templates/${id}/edit?versionId=${version.id}`);
                    }
                } else {
                    setError(res.success ? "Template could not be loaded." : res.error.message);
                }
            } catch (err) {
                if (!cancelled) {
                    setError((err as Error).message || "Failed to load template for editing.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        setLoading(true);
        void load();

        return () => {
            cancelled = true;
        };
    }, [id, requestedVersionId, router]);

    const handleSave = async (model: CanonicalLabelModel): Promise<EditorSaveResult> => {
        if (!editableVersion) {
            return { ok: false, versionId: "", message: "Draft version is not available." };
        }

        try {
            setSaveMessage(null);
            const res = await apiFetch(`/api/Templates/${id}/versions/${editableVersion.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    layoutJson: JSON.stringify(model),
                    changeNotes: "Saved from editor",
                }),
            });

            if (res.success) {
                const message = `Draft v${editableVersion.versionNumber} saved.`;
                setSaveMessage(message);
                return {
                    ok: true,
                    versionId: editableVersion.id,
                    message,
                };
            } else {
                const message = `Draft v${editableVersion.versionNumber} save failed: ${res.error.message}`;
                setSaveMessage(message);
                return {
                    ok: false,
                    versionId: editableVersion.id,
                    message,
                };
            }
        } catch (err) {
            const message = `Draft v${editableVersion.versionNumber} save failed: ${(err as Error).message || "Network error while saving."}`;
            setSaveMessage(message);
            return {
                ok: false,
                versionId: editableVersion.id,
                message,
            };
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

    const initialModel: CanonicalLabelModel = normalizeCanonicalLabelModel(
        JSON.parse(editableVersion.layoutJson || "{}"),
        template.name
    );

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overscroll-none">
                {saveMessage ? (
                    <div className="absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)]">
                        {saveMessage}
                    </div>
                ) : null}
                <EditorWorkspace
                    initialModel={initialModel}
                    onSave={handleSave}
                    previewHref={`/templates/${template.id}/preview?versionId=${editableVersion.id}`}
                />
            </div>
        </RoleGuard>
    );
}
