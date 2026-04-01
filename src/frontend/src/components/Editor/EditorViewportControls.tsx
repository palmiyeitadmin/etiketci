"use client";

import { CornersOut, FrameCorners, MagnifyingGlassPlus, Minus, Plus, Sun, Moon, SquaresFour } from "@phosphor-icons/react";
import { EditorCommandButton } from "@/components/Editor/EditorIconButton";
import { useI18n } from "@/lib/i18n";

export function EditorViewportControls({
    zoom,
    onZoomIn,
    onZoomOut,
    onFit,
    onFitSelection,
    onReset,
    previewMode,
    onSetPreviewMode,
}: {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onFitSelection?: () => void;
    onReset: () => void;
    previewMode: "light" | "dark" | "checkerboard";
    onSetPreviewMode: (mode: "light" | "dark" | "checkerboard") => void;
}) {
    const { locale } = useI18n();
    const text = locale === "tr"
        ? { zoomOut: "Uzaklaştır", zoomIn: "Yakınlaştır", fit: "Sığdır", fitSelection: "Seçime Yakınlaş" }
        : { zoomOut: "Zoom Out", zoomIn: "Zoom In", fit: "Fit Canvas", fitSelection: "Zoom to Selection" };

    return (
        <div className="flex items-center gap-2">
            {onFitSelection && <EditorCommandButton icon={MagnifyingGlassPlus} label={text.fitSelection} onClick={onFitSelection} />}
            <EditorCommandButton icon={Minus} label={text.zoomOut} onClick={onZoomOut} />
            <div className="inline-flex h-10 min-w-[4.75rem] items-center justify-center rounded-xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                {Math.round(zoom * 100)}%
            </div>
            <EditorCommandButton icon={Plus} label={text.zoomIn} onClick={onZoomIn} />
            <EditorCommandButton icon={CornersOut} label={text.fit} onClick={onFit} />
            <EditorCommandButton icon={FrameCorners} label="100%" onClick={onReset} />
            
            <div className="mx-2 h-6 w-px bg-white/10" />

            <div className="flex items-center rounded-xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-1">
                <button
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${previewMode === "light" ? "bg-white/10 text-white" : "text-[color:var(--plms-text-subtle)] hover:text-white"}`}
                    onClick={() => onSetPreviewMode("light")}
                    title="Aydinlik Mod"
                >
                    <Sun size={18} weight={previewMode === "light" ? "bold" : "regular"} />
                </button>
                <button
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${previewMode === "dark" ? "bg-white/10 text-white" : "text-[color:var(--plms-text-subtle)] hover:text-white"}`}
                    onClick={() => onSetPreviewMode("dark")}
                    title="Karanlik Mod"
                >
                    <Moon size={18} weight={previewMode === "dark" ? "bold" : "regular"} />
                </button>
                <button
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${previewMode === "checkerboard" ? "bg-white/10 text-white" : "text-[color:var(--plms-text-subtle)] hover:text-white"}`}
                    onClick={() => onSetPreviewMode("checkerboard")}
                    title="Dama Tahtasi"
                >
                    <SquaresFour size={18} weight={previewMode === "checkerboard" ? "bold" : "regular"} />
                </button>
            </div>
        </div>
    );
}
