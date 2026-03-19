"use client";

import { Barcode, Circle, CursorClick, FolderOpen, HandPalm, ImageSquare, Minus, QrCode, Square, TextT } from "@phosphor-icons/react";
import { EditorToolButton } from "@/components/Editor/EditorIconButton";
import { EditorTool } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";

type ToolDef = { tool: EditorTool; labelTr: string; labelEn: string; icon: any };

const TOOL_DEFS: ToolDef[] = [
    { tool: "select", labelTr: "Sec", labelEn: "Select", icon: CursorClick },
    { tool: "pan", labelTr: "Kaydir", labelEn: "Pan", icon: HandPalm },
    { tool: "text", labelTr: "Metin", labelEn: "Text", icon: TextT },
    { tool: "rect", labelTr: "Dikdortgen", labelEn: "Rectangle", icon: Square },
    { tool: "ellipse", labelTr: "Oval", labelEn: "Oval", icon: Circle },
    { tool: "line", labelTr: "Cizgi", labelEn: "Line", icon: Minus },
    { tool: "barcode", labelTr: "Barkod", labelEn: "Barcode", icon: Barcode },
    { tool: "qr", labelTr: "QR Kod", labelEn: "QR Code", icon: QrCode },
    { tool: "image", labelTr: "Gorsel", labelEn: "Image", icon: ImageSquare },
];

export function EditorToolRail({
    activeTool,
    onSelectTool,
    onOpenLibrary,
}: {
    activeTool: EditorTool;
    onSelectTool: (tool: EditorTool) => void;
    onOpenLibrary: () => void;
}) {
    const { locale } = useI18n();
    const libraryLabel = locale === "tr" ? "Kutuphane" : "Library";

    return (
        <aside className="h-full min-h-0 w-16 shrink-0 overflow-hidden border-r border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-2 py-3">
            <div className="custom-scrollbar flex h-full min-h-0 flex-col items-center gap-2 overflow-y-auto overscroll-contain pb-4">
            {TOOL_DEFS.map((tool) => (
                <EditorToolButton
                    key={tool.tool}
                    icon={tool.icon}
                    label={locale === "tr" ? tool.labelTr : tool.labelEn}
                    active={activeTool === tool.tool}
                    onClick={() => onSelectTool(tool.tool)}
                />
            ))}
            <div className="my-1 h-px w-10 bg-[color:var(--plms-border)]" />
            <EditorToolButton icon={FolderOpen} label={libraryLabel} onClick={onOpenLibrary} />
            </div>
        </aside>
    );
}
