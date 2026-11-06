"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { apiFetch } from "@/lib/api-client";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { findEditorDraftVersion, findTemplateVersion, resolveEditorDraftVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { EditorShell } from "@/components/Editor/EditorShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArrowLeft, CheckCircle, CircleNotch, PencilSimpleLine, WarningCircle, X } from "@phosphor-icons/react";
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
    const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const saveMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
            loadError: "Şablon yüklenemedi",
            loadFailed: "Düzenleme için şablon yüklenemedi",
            draftUnavailable: "Taslak sürüm kullanılamıyor",
            saved: "Taslak v{version} kaydedildi",
            saveFailed: "Taslak v{version} kaydedilemedi: {message}",
            loading: "Editör yükleniyor",
            backToDetail: "Şablona dön",
            notFound: "Şablon bulunamadı",
            changeNotes: "Editör üzerinden kaydedildi",
            networkError: "Kayıt sırasında bağlantı hatası oluştu",
            draftTitle: "Bu sürüm düzenlenemez",
            draftBody: "Yayınlanmış ve onaylanmış sürümler değişmez. Değişiklik yapmak için bu sürümden yeni bir taslak oluşturun.",
            draftCreate: "Taslak oluştur ve düzenle",
            draftCreating: "Taslak oluşturuluyor",
            dismiss: "Kapat",
        }
        : {
            loadError: "Template could not be loaded",
            loadFailed: "Template could not be loaded for editing",
            draftUnavailable: "Draft version is not available",
            saved: "Draft v{version} saved",
            saveFailed: "Draft v{version} could not be saved: {message}",
            loading: "Loading editor",
            backToDetail: "Back to template",
            notFound: "Template not found",
            changeNotes: "Saved from editor",
            networkError: "Network error while saving",
            draftTitle: "This version cannot be edited",
            draftBody: "Published and approved versions do not change. Create a new draft from this version to make changes.",
            draftCreate: "Create draft and edit",
            draftCreating: "Creating draft",
            dismiss: "Dismiss",
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

    useEffect(() => () => {
        if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current);
    }, []);

    // A successful save fades out on its own (the top bar keeps the save state); a failure stays until dismissed.
    const showSaveMessage = (message: string, ok: boolean) => {
        if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current);
        setSaveMessage({ text: message, ok });
        if (ok) {
            saveMessageTimer.current = setTimeout(() => setSaveMessage(null), 4000);
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
                showSaveMessage(message, true);
                return {
                    ok: true,
                    versionId: editableVersion.id,
                    message,
                };
            } else {
                const message = text.saveFailed
                    .replace("{version}", String(editableVersion.versionNumber))
                    .replace("{message}", res.error.message);
                showSaveMessage(message, false);
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
            showSaveMessage(message, false);
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

    if (loading) return (
        <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-3">
            <CircleNotch size={16} className="animate-spin" />
            {text.loading}
        </div>
    );
    if (error) return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="flex max-w-md flex-col items-center gap-4 text-center">
                <p className="flex items-center gap-2 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                    <WarningCircle size={16} className="shrink-0" />
                    {error}
                </p>
                <Link href={`/templates/${id}`} className="plms-button-secondary">
                    <ArrowLeft size={16} />
                    {text.backToDetail}
                </Link>
            </div>
        </div>
    );
    if (template && needsDraft) {
        const sourceVersion = findTemplateVersion(template, requestedVersionId) ?? template.currentActiveVersion ?? undefined;
        return (
            <RoleGuard allowedRoles={["Admin", "Operator"]}>
                <div className="flex h-full items-center justify-center overflow-y-auto p-6">
                    <div className="plms-card flex w-full max-w-lg flex-col gap-4 p-6">
                        <div className="flex items-center gap-2 text-sm text-ink-2">
                            <span className="min-w-0 truncate">{template.name}</span>
                            {sourceVersion ? (
                                <>
                                    <span className="font-mono text-xs text-ink-3">v{sourceVersion.versionNumber}</span>
                                    <StatusBadge label={sourceVersion.status} tone={sourceVersion.status === "Published" || sourceVersion.status === "Approved" ? "success" : "neutral"} />
                                </>
                            ) : null}
                        </div>
                        <div className="space-y-1.5">
                            <h1 className="text-lg font-medium text-ink">{text.draftTitle}</h1>
                            <p className="text-base text-ink-2">{text.draftBody}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <button type="button" className="plms-button-primary" onClick={handleCreateDraft} disabled={creatingDraft}>
                                {creatingDraft ? <CircleNotch size={16} className="animate-spin" /> : <PencilSimpleLine size={16} />}
                                {creatingDraft ? text.draftCreating : text.draftCreate}
                            </button>
                            <Link href={`/templates/${id}`} className="plms-button-secondary">{text.backToDetail}</Link>
                        </div>
                    </div>
                </div>
            </RoleGuard>
        );
    }
    if (!template || !editableVersion || !initialModel) return <div className="flex h-full items-center justify-center text-sm text-ink-3">{text.notFound}</div>;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden overscroll-none">
                {saveMessage ? (
                    <div
                        role={saveMessage.ok ? "status" : "alert"}
                        className={`absolute left-1/2 top-16 z-40 flex max-w-xl -translate-x-1/2 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm shadow-pop ${saveMessage.ok ? "bg-surface text-ink" : "bg-bad-soft text-bad"}`}
                    >
                        {saveMessage.ok ? <CheckCircle size={16} className="shrink-0 text-good" /> : <WarningCircle size={16} className="shrink-0" />}
                        <span className="min-w-0">{saveMessage.text}</span>
                        {!saveMessage.ok ? (
                            <button type="button" className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface" onClick={() => setSaveMessage(null)} aria-label={text.dismiss} title={text.dismiss}>
                                <X size={16} />
                            </button>
                        ) : null}
                    </div>
                ) : null}
                <EditorShell
                    initialModel={initialModel}
                    onSave={handleSave}
                    previewHref={`/templates/${template.id}/preview?versionId=${editableVersion.id}`}
                    backHref={`/templates/${template.id}`}
                    versionLabel={`v${editableVersion.versionNumber}`}
                    status={editableVersion.status}
                    onRenameTemplate={handleRenameTemplate}
                />
            </div>
        </RoleGuard>
    );
}
