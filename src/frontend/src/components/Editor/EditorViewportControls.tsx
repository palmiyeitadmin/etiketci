"use client";

import { CornersOut, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { EditorCommandButton, EditorTooltip } from "@/components/Editor/EditorIconButton";
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
        ? { zoomOut: "Uzaklaştır", zoomIn: "Yakınlaştır", fit: "Ekrana sığdır", reset: "Gerçek boyut (%100)" }
        : { zoomOut: "Zoom out", zoomIn: "Zoom in", fit: "Fit to screen", reset: "Actual size (100%)" };
    const percent = Math.round(zoom * 100);
    const wheel = locale === "tr" ? ["Ctrl", "Tekerlek"] : ["Ctrl", "Wheel"];

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
                    {locale === "tr" ? `%${percent}` : `${percent}%`}
                </button>
            </EditorTooltip>
            <EditorCommandButton icon={MagnifyingGlassPlus} label={text.zoomIn} shortcut={wheel} onClick={onZoomIn} />
            <EditorCommandButton icon={CornersOut} label={text.fit} onClick={onFit} />
        </div>
    );
}
