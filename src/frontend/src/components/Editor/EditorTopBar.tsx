"use client";

import Link from "next/link";
import { ArrowClockwise, ArrowCounterClockwise, ArrowUDownLeft, ArrowUDownRight, Copy, Eye, FloppyDisk, Trash } from "@phosphor-icons/react";
import { EditorCommandButton } from "@/components/Editor/EditorIconButton";
import { EditorViewportControls } from "@/components/Editor/EditorViewportControls";
import { useI18n } from "@/lib/i18n";

export function EditorTopBar({
    name,
    dimensions,
    zoom,
    previewHref,
    isDirty,
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
}: {
    name: string;
    dimensions: { widthMm: number; heightMm: number };
    zoom: number;
    previewHref?: string;
    isDirty: boolean;
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
}) {
    const { locale } = useI18n();
    const text = locale === "tr"
        ? {
            eyebrow: "Birlesik editor",
            undo: "Geri al",
            redo: "Yinele",
            rotateLeft: "Sola dondur",
            rotateRight: "Saga dondur",
            duplicate: "Cogalt",
            delete: "Sil",
            preview: "Onizleme",
            saved: "Kaydedildi",
        }
        : {
            eyebrow: "Unified editor",
            undo: "Undo",
            redo: "Redo",
            rotateLeft: "Rotate Left",
            rotateRight: "Rotate Right",
            duplicate: "Duplicate",
            delete: "Delete",
            preview: "Preview",
            saved: "Saved",
        };

    return (
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-4 py-3 xl:px-6">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.eyebrow}</div>
                    <h2 className="truncate text-lg font-black tracking-[-0.04em] text-white">{name}</h2>
                </div>
                <div className="hidden rounded-xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)] lg:block">
                    {dimensions.widthMm} x {dimensions.heightMm} mm
                </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-2 py-2">
                    <EditorCommandButton icon={ArrowCounterClockwise} label={text.undo} onClick={onUndo} disabled={!canUndo} />
                    <EditorCommandButton icon={ArrowClockwise} label={text.redo} onClick={onRedo} disabled={!canRedo} />
                    <EditorCommandButton icon={ArrowUDownLeft} label={text.rotateLeft} onClick={onRotateLeft} />
                    <EditorCommandButton icon={ArrowUDownRight} label={text.rotateRight} onClick={onRotateRight} />
                    <EditorCommandButton icon={Copy} label={text.duplicate} onClick={onDuplicate} />
                    <EditorCommandButton icon={Trash} label={text.delete} onClick={onDelete} tone="danger" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-2 py-2">
                    <EditorViewportControls zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} onReset={onReset} />
                    {previewHref ? (
                        <Link href={previewHref} className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[color:var(--plms-border)] bg-white/[0.02] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-muted)] transition-colors hover:bg-white/[0.06] hover:text-white">
                            <Eye size={16} weight="bold" />
                            <span className="hidden xl:inline">{text.preview}</span>
                        </Link>
                    ) : null}
                    <button className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-700" type="button" onClick={onSave}>
                        <FloppyDisk size={16} weight="bold" />
                        <span className="hidden xl:inline">{isDirty ? "Save Draft" : text.saved}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
