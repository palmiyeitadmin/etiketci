"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Eye, FloppyDisk, Question, X } from "@phosphor-icons/react";
import { EditorCommandButton } from "@/components/Editor/EditorIconButton";
import { useI18n } from "@/lib/i18n";

export function EditorTopBar({
    name,
    dimensions,
    previewHref,
    isDirty,
    onSave,
    onRenameTemplate,
    onResizeCanvas,
    onToggleHelp,
}: {
    name: string;
    dimensions: { widthMm: number; heightMm: number };
    previewHref?: string;
    isDirty: boolean;
    onSave: () => void;
    onRenameTemplate?: (name: string) => Promise<void>;
    onResizeCanvas?: (dimensions: { widthMm: number; heightMm: number }) => Promise<void>;
    onToggleHelp: () => void;
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
            saveDraft: "Taslagi kaydet",
            saved: "Kaydedildi",
            renameHint: "Yeniden adlandirmak icin cift tiklayin",
            invalidDimensions: "Gecersiz boyutlar",
            invalidName: "Gecersiz isim",
        }
        : {
            eyebrow: "Unifed editor",
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
        <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-8 shadow-sm">
            <div className="flex min-w-0 items-center gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-muted)]">
                        {text.eyebrow}
                    </span>
                    {editingName ? (
                        <div className="flex items-center gap-1">
                            <input
                                className="h-8 w-32 rounded-lg border border-blue-400/30 bg-[#0b1220] px-2 text-[9px] font-semibold text-white outline-none"
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
                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50" onClick={() => void confirmName()} disabled={pendingField !== null}>
                                <Check size={14} weight="bold" />
                            </button>
                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] text-[color:var(--plms-text-muted)] transition-colors hover:bg-white/5 hover:text-white" onClick={() => { setEditingName(false); setDraftName(name); setInlineError(null); }} disabled={pendingField !== null}>
                                <X size={14} weight="bold" />
                            </button>
                        </div>
                    ) : (
                        <h2
                            className="truncate text-sm font-black tracking-[-0.04em] text-white"
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
                    {inlineError ? <div className="text-[8px] font-medium text-red-300">{inlineError}</div> : null}
                </div>
                {editingDimensions ? (
                    <div className="hidden items-center gap-1">
                        <input
                            className="h-8 w-16 rounded-lg border border-blue-400/30 bg-[#0b1220] px-2 text-[9px] font-black uppercase tracking-[0.18em] text-white outline-none"
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
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">x</span>
                        <input
                            className="h-8 w-16 rounded-lg border border-blue-400/30 bg-[#0b1220] px-2 text-[9px] font-black uppercase tracking-[0.18em] text-white outline-none"
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
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">mm</span>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-50" onClick={() => void confirmDimensions()} disabled={pendingField !== null}>
                            <Check size={14} weight="bold" />
                        </button>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] text-[color:var(--plms-text-muted)] transition-colors hover:bg-white/5 hover:text-white" onClick={() => { setEditingDimensions(false); setDraftWidth(String(dimensions.widthMm)); setDraftHeight(String(dimensions.heightMm)); setInlineError(null); }} disabled={pendingField !== null}>
                            <X size={14} weight="bold" />
                        </button>
                    </div>
                ) : (
                    <div
                        className="hidden shrink-0 rounded-lg border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]"
                        title={text.renameHint}
                        onDoubleClick={() => {
                            setEditingDimensions(true);
                            setEditingName(false);
                            setInlineError(null);
                        }}
                    >
                        {dimensions.widthMm} × {dimensions.heightMm} mm
                    </div>
                )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-1 overflow-x-auto">
                <EditorCommandButton icon={Question} label={locale === "tr" ? "Yardim" : "Help"} onClick={onToggleHelp} />

                {previewHref ? (
                    <Link href={previewHref} className="inline-flex h-8 items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:bg-cyan-500/15">
                        <Eye size={14} weight="bold" />
                        <span className="hidden xl:inline">{locale === "tr" ? "Önizleme" : "Preview"}</span>
                    </Link>
                ) : null}
                <button className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-700" type="button" onClick={onSave}>
                    <FloppyDisk size={14} weight="bold" />
                    <span className="hidden xl:inline">{isDirty ? text.saveDraft : text.saved}</span>
                </button>
            </div>
        </header>
    );
}
