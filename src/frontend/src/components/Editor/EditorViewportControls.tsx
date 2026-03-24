"use client";

import { CornersOut, FrameCorners, Minus, Plus } from "@phosphor-icons/react";
import { EditorCommandButton } from "@/components/Editor/EditorIconButton";
import { useI18n } from "@/lib/i18n";

export function EditorViewportControls({
    zoom,
    onZoomIn,
    onZoomOut,
    onFit,
    onReset,
}: {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onReset: () => void;
}) {
    const { locale } = useI18n();
    const text = locale === "tr"
        ? { zoomOut: "Uzaklastir", zoomIn: "Yakinlastir", fit: "Sigdir" }
        : { zoomOut: "Zoom Out", zoomIn: "Zoom In", fit: "Fit" };

    return (
        <div className="flex items-center gap-2">
            <EditorCommandButton icon={Minus} label={text.zoomOut} onClick={onZoomOut} />
            <div className="inline-flex h-10 min-w-[4.75rem] items-center justify-center rounded-xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                {Math.round(zoom * 100)}%
            </div>
            <EditorCommandButton icon={Plus} label={text.zoomIn} onClick={onZoomIn} />
            <EditorCommandButton icon={CornersOut} label={text.fit} onClick={onFit} />
            <EditorCommandButton icon={FrameCorners} label="100%" onClick={onReset} />
        </div>
    );
}
