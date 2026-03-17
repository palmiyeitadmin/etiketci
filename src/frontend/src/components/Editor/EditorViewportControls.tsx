"use client";

import { CornersOut, FrameCorners, Minus, Plus } from "@phosphor-icons/react";
import { EditorCommandButton } from "@/components/Editor/EditorIconButton";

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
    return (
        <div className="flex items-center gap-2">
            <EditorCommandButton icon={Minus} label="Zoom Out" onClick={onZoomOut} />
            <div className="rounded-xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                {Math.round(zoom * 100)}%
            </div>
            <EditorCommandButton icon={Plus} label="Zoom In" onClick={onZoomIn} />
            <EditorCommandButton icon={CornersOut} label="Fit" onClick={onFit} />
            <EditorCommandButton icon={FrameCorners} label="100%" onClick={onReset} />
        </div>
    );
}
