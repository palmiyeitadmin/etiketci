"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { apiFetch } from "@/lib/api-client";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { findEditorDraftVersion, findTemplateVersion, resolveEditorDraftVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { EditorWorkspace } from "@/components/Editor/EditorWorkspace";
import { CanonicalLabelModel } from "@/types/canvas";
import { normalizeCanonicalLabelModel } from "@/lib/editor-canonical";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function TemplateEditorPage() {
    const { locale } = useI18n();
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
    const [needsDraft, setNeedsDraft] = useState(false);
    const [creatingDraft, setCreatingDraft] = useState(false);
    const initialModel = useMemo(() => {
        if (!template || !editableVersion) {
            return null;
        }

        return normalizeCanonicalLabelModel(
            JSON.parse(editableVersion.layoutJson || "{}"),
            template.name
        );
    }, [editableVersion, template]);

    const text = locale === "tr"
        ? {
            loadError: "Sablon yuklenemedi.",
            loadFailed: "Duzenleme icin sablon yuklenemedi.",
            draftUnavailable: "Taslak surum kullanilabilir degil.",
            saved: "Taslak v{version} kaydedildi.",
            saveFailed: "Taslak v{version} kaydi basarisiz: {message}",
            loading: "Editor yukleniyor...",
            backToDetail: "Detaya Don",
            notFound: "Sablon bulunamadi.",
            changeNotes: "Editor uzerinden kaydedildi",
            networkError: "Kayit sirasinda ag hatasi olustu.",
            draftTitle: "Bu surum duzenlenemez",
            draftBody: "Yayinlanmis ve onaylanmis surumler degismez. Degisiklik yapmak icin bu surumden yeni bir taslak olusturun.",
            draftCreate: "Taslak olustur ve duzenle",
            draftCreating: "Taslak olusturuluyor",
        }
        : {
            loadError: "Template could not be loaded.",
            loadFailed: "Failed to load template for editing.",
            draftUnavailable: "Draft version is not available.",
            saved: "Draft v{version} saved.",
            saveFailed: "Draft v{version} save failed: {message}",
            loading: "Loading editor...",
            backToDetail: "Back to Detail",
            notFound: "Template not found.",
            changeNotes: "Saved from editor",
            networkError: "Network error while saving.",
            draftTitle: "This version cannot be edited",
            draftBody: "Published and approved versions do not change. Create a new draft from this version to make changes.",
            draftCreate: "Create draft and edit",
            draftCreating: "Creating draft",
        };

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await apiFetch<LabelTemplate>(`/api/Templates/${id}`);
                if (res.success && res.data) {
                    const templateData = normalizeLabelTemplate(res.data);
                    // Opening the editor never creates a draft by itself; the user confirms it below.
                    const version = findEditorDraftVersion(templateData, requestedVersionId);

                    if (cancelled) {
                        return;
                    }

                    setTemplate(templateData);
                    setEditableVersion(version ?? null);
                    setNeedsDraft(!version);
                    setSaveMessage(null);
                    setError(null);

                    if (version && requestedVersionId !== version.id) {
                        router.replace(`/templates/${id}/edit?versionId=${version.id}`);
                    }
                } else {
                    setError(res.success ? text.loadError : res.error.message);
                }
            } catch (err) {
                if (!cancelled) {
                    setError((err as Error).message || text.loadFailed);
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

    const handleCreateDraft = async () => {
        if (!template) {
            return;
        }

        setCreatingDraft(true);
        try {
            const draft = await resolveEditorDraftVersion(template, requestedVersionId);
            router.replace(`/templates/${id}/edit?versionId=${draft.id}`);
        } catch (err) {
            setError((err as Error).message || text.loadFailed);
        } finally {
            setCreatingDraft(false);
        }
    };

    const handleSave = async (model: CanonicalLabelModel): Promise<EditorSaveResult> => {
        if (!editableVersion) {
            return { ok: false, versionId: "", message: text.draftUnavailable };
        }

        try {
            setSaveMessage(null);
            const res = await apiFetch(`/api/Templates/${id}/versions/${editableVersion.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    layoutJson: JSON.stringify(model),
                    changeNotes: text.changeNotes,
                }),
            });

            if (res.success) {
                const serializedModel = JSON.stringify(model);
                setEditableVersion((current) => current ? { ...current, layoutJson: serializedModel } : current);
                const message = text.saved.replace("{version}", String(editableVersion.versionNumber));
                setSaveMessage(message);
                return {
                    ok: true,
                    versionId: editableVersion.id,
                    message,
                };
            } else {
                const message = text.saveFailed
                    .replace("{version}", String(editableVersion.versionNumber))
                    .replace("{message}", res.error.message);
                setSaveMessage(message);
                return {
                    ok: false,
                    versionId: editableVersion.id,
                    message,
                };
            }
        } catch (err) {
            const message = text.saveFailed
                .replace("{version}", String(editableVersion.versionNumber))
                .replace("{message}", (err as Error).message || text.networkError);
            setSaveMessage(message);
            return {
                ok: false,
                versionId: editableVersion.id,
                message,
            };
        }
    };

    const handleRenameTemplate = async (name: string, model: CanonicalLabelModel) => {
        const trimmedName = name.trim();
        if (!trimmedName || !editableVersion || !template) {
            throw new Error(text.draftUnavailable);
        }

        const metadataRes = await apiFetch(`/api/Templates/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                name: trimmedName,
                description: template.description ?? null,
            }),
        });

        if (!metadataRes.success) {
            throw new Error(metadataRes.error.message);
        }

        const saveResult = await handleSave(model);
        if (!saveResult.ok) {
            throw new Error(saveResult.message);
        }

        setTemplate((current) => current ? { ...current, name: trimmedName } : current);
    };

    if (loading) return <div className="p-8">{text.loading}</div>;
    if (error) return (
        <div className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href={`/templates/${id}`} className="text-blue-600 underline">{text.backToDetail}</Link>
        </div>
    );
    if (template && needsDraft) {
        const sourceVersion = findTemplateVersion(template, requestedVersionId) ?? template.currentActiveVersion ?? undefined;
        return (
            <RoleGuard allowedRoles={["Admin", "Operator"]}>
                <div className="mx-auto mt-16 flex max-w-lg flex-col gap-4 rounded-xl border border-line bg-surface p-6">
                    <h1 className="text-lg font-medium text-ink">{text.draftTitle}</h1>
                    <p className="text-sm text-ink-2">
                        {template.name}{sourceVersion ? ` · v${sourceVersion.versionNumber}` : ""}
                    </p>
                    <p className="text-sm text-ink-2">{text.draftBody}</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className="plms-button-primary" onClick={handleCreateDraft} disabled={creatingDraft}>
                            {creatingDraft ? text.draftCreating : text.draftCreate}
                        </button>
                        <Link href={`/templates/${id}`} className="plms-button-secondary">{text.backToDetail}</Link>
                    </div>
                </div>
            </RoleGuard>
        );
    }
    if (!template || !editableVersion || !initialModel) return <div className="p-8">{text.notFound}</div>;

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
                    onRenameTemplate={handleRenameTemplate}
                />
            </div>
        </RoleGuard>
    );
}
