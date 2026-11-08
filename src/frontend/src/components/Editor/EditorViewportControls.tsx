"use client";

import { CornersOut, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { EditorCommandButton, EditorTooltip } from "@/components/Editor/EditorIconButton";
import { useText } from "@/lib/i18n";

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
    const text = useText("editor").viewport;
    const percent = Math.round(zoom * 100);
    const wheel = ["Ctrl", text.wheel];

    return (
        <div className="flex items-center gap-0.5">
            <EditorCommandButton icon={MagnifyingGlassMinus} label={text.zoomOut} shortcut={wheel} onClick={onZoomOut} />
            <EditorTooltip label={text.reset}>
                <button
                    type="button"
                    onClick={onReset}
                    aria-label={text.reset}
                    className="inline-flex h-8 w-14 items-center justify-center rounded-lg font-mono text-xs tabular text-ink-2 transition-colors hover:bg-raised hover:text-ink"
                >
                    {text.zoomPercent(percent)}
                </button>
            </EditorTooltip>
            <EditorCommandButton icon={MagnifyingGlassPlus} label={text.zoomIn} shortcut={wheel} onClick={onZoomIn} />
            <EditorCommandButton icon={CornersOut} label={text.fit} onClick={onFit} />
        </div>
    );
}
