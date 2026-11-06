"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowCounterClockwise, ArrowLeft, ArrowUUpLeft, ArrowUUpRight, Check, Copy, Eye, FloppyDisk, SidebarSimple, Trash, X } from "@phosphor-icons/react";
import { EditorCommandButton, EditorTooltip } from "@/components/Editor/EditorIconButton";
import { EditorViewportControls } from "@/components/Editor/EditorViewportControls";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useI18n } from "@/lib/i18n";

function getStatusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
    switch (status) {
        case "Draft":
        case "Rejected":
            return "warning";
        case "InReview":
            return "info";
        case "Approved":
        case "Published":
            return "success";
        case "Deprecated":
        case "Archived":
            return "danger";
        default:
            return "neutral";
    }
}

function Divider() {
    return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />;
}

export function EditorTopBar({
    name,
    dimensions,
    zoom,
    previewHref,
    backHref,
    versionLabel,
    status,
    isDirty,
    savePending = false,
    onSave,
    onZoomIn,
    onZoomOut,
    onFit,
    onReset,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onDuplicate,
    onDelete,
    onRotateLeft,
    onRotateRight,
    onRenameTemplate,
    onResizeCanvas,
    hasSelection = true,
    panelsCollapsed,
    onTogglePanels,
}: {
    name: string;
    dimensions: { widthMm: number; heightMm: number };
    zoom: number;
    previewHref?: string;
    backHref?: string;
    versionLabel?: string;
    status?: string;
    isDirty: boolean;
    savePending?: boolean;
    onSave: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onReset: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onRotateLeft: () => void;
    onRotateRight: () => void;
    onRenameTemplate: (name: string) => Promise<void>;
    onResizeCanvas: (dimensions: { widthMm: number; heightMm: number }) => Promise<void>;
    hasSelection?: boolean;
    panelsCollapsed?: boolean;
    onTogglePanels?: () => void;
}) {
    const { locale } = useI18n();
    const [editingName, setEditingName] = useState(false);
    const [editingDimensions, setEditingDimensions] = useState(false);
    const [draftName, setDraftName] = useState(name);
    const [draftWidth, setDraftWidth] = useState(String(dimensions.widthMm));
    const [draftHeight, setDraftHeight] = useState(String(dimensions.heightMm));
    const [pendingField, setPendingField] = useState<"name" | "dimensions" | null>(null);
    const [inlineError, setInlineError] = useState<string | null>(null);
    const text = locale === "tr"
        ? {
            back: "Şablona dön",
            undo: "Geri al",
            redo: "Yinele",
            rotateLeft: "Sola döndür",
            rotateRight: "Sağa döndür",
            duplicate: "Çoğalt",
            delete: "Sil",
            preview: "Önizleme",
            save: "Kaydet",
            saving: "Kaydediliyor",
            saved: "Kaydedildi",
            unsaved: "Kaydedilmemiş değişiklikler",
            renameHint: "Yeniden adlandırmak için çift tıklayın",
            resizeHint: "Boyutu değiştirmek için çift tıklayın",
            nameLabel: "Şablon adı",
            widthLabel: "Genişlik",
            heightLabel: "Yükseklik",
            confirm: "Onayla",
            cancel: "Vazgeç",
            hidePanels: "Panelleri gizle",
            showPanels: "Panelleri göster",
            invalidName: "Şablon adı boş olamaz",
            invalidDimensions: "Genişlik ve yükseklik 10 ile 1000 mm arasında olmalı",
            renameFailed: "Şablon adı kaydedilemedi",
            resizeFailed: "Şablon boyutu kaydedilemedi",
        }
        : {
            back: "Back to template",
            undo: "Undo",
            redo: "Redo",
            rotateLeft: "Rotate left",
            rotateRight: "Rotate right",
            duplicate: "Duplicate",
            delete: "Delete",
            preview: "Preview",
            save: "Save",
            saving: "Saving",
            saved: "Saved",
            unsaved: "Unsaved changes",
            renameHint: "Double-click to rename",
            resizeHint: "Double-click to change the size",
            nameLabel: "Template name",
            widthLabel: "Width",
            heightLabel: "Height",
            confirm: "Confirm",
            cancel: "Cancel",
            hidePanels: "Hide panels",
            showPanels: "Show panels",
            invalidName: "Template name cannot be empty",
            invalidDimensions: "Width and height must stay between 10 and 1000 mm",
            renameFailed: "Template name could not be saved",
            resizeFailed: "Template size could not be saved",
        };

    useEffect(() => {
        if (!editingName) {
            setDraftName(name);
        }
    }, [editingName, name]);

    useEffect(() => {
        if (!editingDimensions) {
            setDraftWidth(String(dimensions.widthMm));
            setDraftHeight(String(dimensions.heightMm));
        }
    }, [dimensions.heightMm, dimensions.widthMm, editingDimensions]);

    async function confirmName() {
        const nextName = draftName.trim();
        if (!nextName) {
            setInlineError(text.invalidName);
            return;
        }

        try {
            setPendingField("name");
            setInlineError(null);
            await onRenameTemplate(nextName);
            setEditingName(false);
        } catch (error) {
            setInlineError((error as Error).message || text.renameFailed);
        } finally {
            setPendingField(null);
        }
    }

    async function confirmDimensions() {
        const widthMm = Number(draftWidth);
        const heightMm = Number(draftHeight);
        if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm < 10 || widthMm > 1000 || heightMm < 10 || heightMm > 1000) {
            setInlineError(text.invalidDimensions);
            return;
        }

        try {
            setPendingField("dimensions");
            setInlineError(null);
            await onResizeCanvas({ widthMm, heightMm });
            setEditingDimensions(false);
        } catch (error) {
            setInlineError((error as Error).message || text.resizeFailed);
        } finally {
            setPendingField(null);
        }
    }

    function cancelName() {
        setEditingName(false);
        setDraftName(name);
        setInlineError(null);
    }

    function cancelDimensions() {
        setEditingDimensions(false);
        setDraftWidth(String(dimensions.widthMm));
        setDraftHeight(String(dimensions.heightMm));
        setInlineError(null);
    }

    const confirmButtons = (onConfirm: () => void, onCancel: () => void) => (
        <>
            <button type="button" className="plms-button-primary h-8 w-8 px-0" onClick={onConfirm} disabled={pendingField !== null} aria-label={text.confirm} title={text.confirm}>
                <Check size={16} />
            </button>
            <button type="button" className="plms-button-ghost h-8 w-8 px-0" onClick={onCancel} disabled={pendingField !== null} aria-label={text.cancel} title={text.cancel}>
                <X size={16} />
            </button>
        </>
    );

    const saveState = savePending ? text.saving : isDirty ? text.unsaved : text.saved;

    return (
        <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                {backHref ? (
                    <EditorTooltip label={text.back} align="start">
                        <Link href={backHref} aria-label={text.back} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-raised hover:text-ink">
                            <ArrowLeft size={16} />
                        </Link>
                    </EditorTooltip>
                ) : null}

                {editingName ? (
                    <div className="flex items-center gap-1">
                        <input
                            className="plms-input h-8 w-64"
                            aria-label={text.nameLabel}
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    void confirmName();
                                }
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    cancelName();
                                }
                            }}
                            autoFocus
                        />
                        {confirmButtons(() => void confirmName(), cancelName)}
                    </div>
                ) : (
                    <h1
                        className="min-w-0 cursor-text truncate rounded-md px-1.5 py-1 text-base font-medium text-ink transition-colors hover:bg-raised"
                        title={text.renameHint}
                        onDoubleClick={() => {
                            setEditingName(true);
                            setEditingDimensions(false);
                            setInlineError(null);
                        }}
                    >
                        {name}
                    </h1>
                )}

                {versionLabel ? <span className="shrink-0 font-mono text-xs text-ink-3">{versionLabel}</span> : null}
                {status ? <span className="hidden shrink-0 lg:inline-flex"><StatusBadge label={status} tone={getStatusTone(status)} /></span> : null}

                {editingDimensions ? (
                    <div className="flex shrink-0 items-center gap-1">
                        {[
                            { value: draftWidth, set: setDraftWidth, label: text.widthLabel },
                            { value: draftHeight, set: setDraftHeight, label: text.heightLabel },
                        ].map((field, index) => (
                            <span key={field.label} className="flex items-center gap-1">
                                {index === 1 ? <span className="font-mono text-xs text-ink-3">×</span> : null}
                                <input
                                    className="plms-input h-8 w-16 px-2 font-mono tabular"
                                    aria-label={`${field.label} (mm)`}
                                    inputMode="decimal"
                                    value={field.value}
                                    autoFocus={index === 0}
                                    onChange={(event) => field.set(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void confirmDimensions();
                                        }
                                        if (event.key === "Escape") {
                                            event.preventDefault();
                                            cancelDimensions();
                                        }
                                    }}
                                />
                            </span>
                        ))}
                        <span className="mr-1 font-mono text-xs text-ink-3">mm</span>
                        {confirmButtons(() => void confirmDimensions(), cancelDimensions)}
                    </div>
                ) : (
                    <span
                        className="hidden shrink-0 cursor-text whitespace-nowrap rounded-md px-1.5 py-1 font-mono text-xs tabular text-ink-3 transition-colors hover:bg-raised hover:text-ink-2 lg:inline"
                        title={text.resizeHint}
                        onDoubleClick={() => {
                            setEditingDimensions(true);
                            setEditingName(false);
                            setInlineError(null);
                        }}
                    >
                        {dimensions.widthMm} × {dimensions.heightMm} mm
                    </span>
                )}
            </div>

            <div className="flex shrink-0 items-center">
                <EditorCommandButton icon={ArrowUUpLeft} label={text.undo} shortcut={["Ctrl", "Z"]} onClick={onUndo} disabled={!canUndo} />
                <EditorCommandButton icon={ArrowUUpRight} label={text.redo} shortcut={["Ctrl", "Shift", "Z"]} onClick={onRedo} disabled={!canRedo} />
                <Divider />
                <EditorCommandButton icon={ArrowCounterClockwise} label={text.rotateLeft} shortcut={["Shift", "R"]} onClick={onRotateLeft} disabled={!hasSelection} />
                <EditorCommandButton icon={ArrowClockwise} label={text.rotateRight} shortcut={["R"]} onClick={onRotateRight} disabled={!hasSelection} />
                <EditorCommandButton icon={Copy} label={text.duplicate} shortcut={["Ctrl", "D"]} onClick={onDuplicate} disabled={!hasSelection} />
                <EditorCommandButton icon={Trash} label={text.delete} shortcut={["Del"]} onClick={onDelete} tone="danger" disabled={!hasSelection} />
                <Divider />
                <EditorViewportControls zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} onReset={onReset} />
                <Divider />
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs text-ink-3 xl:inline-flex" aria-live="polite">
                    {isDirty && !savePending ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warn" /> : null}
                    {saveState}
                </span>
                {previewHref ? (
                    <Link href={previewHref} className="plms-button-secondary h-8 px-3" aria-label={text.preview}>
                        <Eye size={16} />
                        <span className="hidden lg:inline">{text.preview}</span>
                    </Link>
                ) : null}
                <EditorTooltip label={text.save} shortcut={["Ctrl", "S"]} align="end">
                    <button className="plms-button-primary h-8 px-3" type="button" onClick={onSave} disabled={savePending} aria-keyshortcuts="Control+S">
                        <FloppyDisk size={16} />
                        {text.save}
                    </button>
                </EditorTooltip>
                {onTogglePanels ? (
                    <span className="hidden xl:inline-flex">
                        <EditorCommandButton
                            icon={SidebarSimple}
                            label={panelsCollapsed ? text.showPanels : text.hidePanels}
                            onClick={onTogglePanels}
                            active={!panelsCollapsed}
                            align="end"
                        />
                    </span>
                ) : null}
            </div>

            {inlineError ? (
                <div role="alert" className="absolute left-14 top-full z-40 mt-2 rounded-lg border border-line bg-bad-soft px-3 py-1.5 text-sm text-bad shadow-pop">
                    {inlineError}
                </div>
            ) : null}
        </header>
    );
}
