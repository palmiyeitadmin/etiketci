"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowCounterClockwise, Check, Eye, FloppyDisk, X } from "@phosphor-icons/react";
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
    onRenameTemplate,
    onResizeCanvas,
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
    onRenameTemplate: (name: string) => Promise<void>;
    onResizeCanvas: (dimensions: { widthMm: number; heightMm: number }) => Promise<void>;
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
            eyebrow: "Birlesik editor",
            undo: "Geri al",
            redo: "Yinele",
            preview: "Onizleme",
            saved: "Kaydedildi",
            saveDraft: "Taslak Kaydet",
            renameHint: "Duzenlemek icin cift tiklayin",
            invalidName: "Sablon adi bos olamaz.",
            invalidDimensions: "Genislik ve yukseklik 10 ile 1000 mm arasinda olmalidir.",
            renameFailed: "Sablon adi kaydedilemedi.",
            resizeFailed: "Sablon boyutu kaydedilemedi.",
        }
        : {
            eyebrow: "Unified editor",
            undo: "Undo",
            redo: "Redo",
            preview: "Preview",
            saved: "Saved",
            saveDraft: "Save Draft",
            renameHint: "Double click to edit",
            invalidName: "Template name cannot be empty.",
            invalidDimensions: "Width and height must stay between 10 and 1000 mm.",
            renameFailed: "Template name could not be saved.",
            resizeFailed: "Template size could not be saved.",
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

    return (
        <header className="flex shrink-0 flex-col gap-3 border-b border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-4 py-3 xl:px-6 2xl:flex-row 2xl:items-start 2xl:justify-between 2xl:gap-4">
            <div className="flex min-w-0 items-center gap-3 overflow-hidden 2xl:flex-1">
                <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.eyebrow}</div>
                    {editingName ? (
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                className="h-10 min-w-[240px] rounded-xl border border-blue-400/30 bg-[#0b1220] px-3 text-lg font-black tracking-[-0.04em] text-white outline-none"
                                value={draftName}
                                onChange={(event) => setDraftName(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        void confirmName();
                                    }
                                    if (event.key === "Escape") {
                                        event.preventDefault();
                                        setEditingName(false);
                                        setDraftName(name);
                                        setInlineError(null);
                                    }
                                }}
                                autoFocus
                            />
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50" onClick={() => void confirmName()} disabled={pendingField !== null}>
                                <Check size={16} weight="bold" />
                            </button>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] text-[color:var(--plms-text-muted)] transition-colors hover:bg-white/5 hover:text-white" onClick={() => { setEditingName(false); setDraftName(name); setInlineError(null); }} disabled={pendingField !== null}>
                                <X size={16} weight="bold" />
                            </button>
                        </div>
                    ) : (
                        <h2
                            className="truncate text-lg font-black tracking-[-0.04em] text-white"
                            title={text.renameHint}
                            onDoubleClick={() => {
                                setEditingName(true);
                                setEditingDimensions(false);
                                setInlineError(null);
                            }}
                        >
                            {name}
                        </h2>
                    )}
                    {inlineError ? <div className="mt-2 text-xs font-medium text-red-300">{inlineError}</div> : null}
                </div>
                {editingDimensions ? (
                    <div className="hidden items-center gap-2 lg:flex">
                        <input
                            className="h-10 w-24 rounded-xl border border-blue-400/30 bg-[#0b1220] px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white outline-none"
                            value={draftWidth}
                            onChange={(event) => setDraftWidth(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    void confirmDimensions();
                                }
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    setEditingDimensions(false);
                                    setDraftWidth(String(dimensions.widthMm));
                                    setDraftHeight(String(dimensions.heightMm));
                                    setInlineError(null);
                                }
                            }}
                        />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">x</span>
                        <input
                            className="h-10 w-24 rounded-xl border border-blue-400/30 bg-[#0b1220] px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white outline-none"
                            value={draftHeight}
                            onChange={(event) => setDraftHeight(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    void confirmDimensions();
                                }
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    setEditingDimensions(false);
                                    setDraftWidth(String(dimensions.widthMm));
                                    setDraftHeight(String(dimensions.heightMm));
                                    setInlineError(null);
                                }
                            }}
                        />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">mm</span>
                        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50" onClick={() => void confirmDimensions()} disabled={pendingField !== null}>
                            <Check size={16} weight="bold" />
                        </button>
                        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] text-[color:var(--plms-text-muted)] transition-colors hover:bg-white/5 hover:text-white" onClick={() => { setEditingDimensions(false); setDraftWidth(String(dimensions.widthMm)); setDraftHeight(String(dimensions.heightMm)); setInlineError(null); }} disabled={pendingField !== null}>
                            <X size={16} weight="bold" />
                        </button>
                    </div>
                ) : (
                    <div
                        className="hidden shrink-0 rounded-xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)] lg:block"
                        title={text.renameHint}
                        onDoubleClick={() => {
                            setEditingDimensions(true);
                            setEditingName(false);
                            setInlineError(null);
                        }}
                    >
                        {dimensions.widthMm} x {dimensions.heightMm} mm
                    </div>
                )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2 overflow-x-auto pb-1 2xl:pb-0">
                <div className="flex items-center gap-1.5 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <EditorCommandButton icon={ArrowCounterClockwise} label={text.undo} onClick={onUndo} disabled={!canUndo} />
                    <EditorCommandButton icon={ArrowClockwise} label={text.redo} onClick={onRedo} disabled={!canRedo} />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <EditorViewportControls zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} onReset={onReset} />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    {previewHref ? (
                        <Link href={previewHref} className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:bg-cyan-500/15">
                            <Eye size={16} weight="bold" />
                            <span className="hidden xl:inline">{text.preview}</span>
                        </Link>
                    ) : null}
                    <button className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-700" type="button" onClick={onSave}>
                        <FloppyDisk size={16} weight="bold" />
                        <span className="hidden xl:inline">{isDirty ? text.saveDraft : text.saved}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
