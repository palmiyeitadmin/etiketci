"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowCounterClockwise, Check, Eye, FloppyDisk, Question, X } from "@phosphor-icons/react";
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
    onFitSelection,
    onReset,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onRenameTemplate,
    onResizeCanvas,
    onToggleHelp,
    previewMode,
    onSetPreviewMode,
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
    onFitSelection: () => void;
    onReset: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onRenameTemplate?: (name: string) => Promise<void>;
    onResizeCanvas?: (dimensions: { widthMm: number; heightMm: number }) => Promise<void>;
    onToggleHelp: () => void;
    previewMode: "light" | "dark" | "checkerboard";
    onSetPreviewMode: (mode: "light" | "dark" | "checkerboard") => void;
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
            saveDraft: "Taslagi kaydet",
            saved: "Kaydedildi",
            renameHint: "Yeniden adlandirmak icin cift tiklayin",
            invalidDimensions: "Gecersiz boyutlar",
            invalidName: "Gecersiz isim",
        }
        : {
            eyebrow: "Unifed editor",
            undo: "Undo",
            redo: "Redo",
            preview: "Preview",
            saveDraft: "Save draft",
            saved: "Saved",
            renameHint: "Double-click to rename",
            invalidDimensions: "Invalid dimensions",
            invalidName: "Invalid name",
        };

    useEffect(() => {
        setDraftName(name);
    }, [name]);

    useEffect(() => {
        setDraftWidth(String(dimensions.widthMm));
        setDraftHeight(String(dimensions.heightMm));
    }, [dimensions]);

    const confirmName = async () => {
        if (!draftName.trim() || !onRenameTemplate) return;
        setPendingField("name");
        try {
            await onRenameTemplate(draftName);
            setEditingName(false);
        } catch (err: any) {
            setInlineError(err.message || text.invalidName);
        } finally {
            setPendingField(null);
        }
    };

    const confirmDimensions = async () => {
        const w = parseFloat(draftWidth);
        const h = parseFloat(draftHeight);
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0 || !onResizeCanvas) {
            setInlineError(text.invalidDimensions);
            return;
        }
        setPendingField("dimensions");
        try {
            await onResizeCanvas({ widthMm: w, heightMm: h });
            setEditingDimensions(false);
        } catch (err: any) {
            setInlineError(err.message || text.invalidDimensions);
        } finally {
            setPendingField(null);
        }
    };

    return (
        <header className="flex h-20 w-full shrink-0 items-center justify-between border-b border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-8 shadow-sm">
            <div className="flex min-w-0 items-center gap-6">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-muted)]">
                        {text.eyebrow}
                    </span>
                    {editingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                className="h-10 w-48 rounded-xl border border-blue-400/30 bg-[#0b1220] px-3 font-semibold text-white outline-none"
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
                    <EditorViewportControls
                        zoom={zoom}
                        onZoomIn={onZoomIn}
                        onZoomOut={onZoomOut}
                        onFit={onFit}
                        onFitSelection={onFitSelection}
                        onReset={onReset}
                        previewMode={previewMode}
                        onSetPreviewMode={onSetPreviewMode}
                    />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <EditorCommandButton icon={Question} label={locale === "tr" ? "Yardim" : "Help"} onClick={onToggleHelp} />
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
