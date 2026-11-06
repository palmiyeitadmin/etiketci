"use client";

import { Barcode, Circle, CursorClick, FolderOpen, HandPalm, Icon, ImageSquare, Minus, QrCode, Square, TextT } from "@phosphor-icons/react";
import { EditorToolButton } from "@/components/Editor/EditorIconButton";
import { EditorTool, ElementType } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";

type ToolDef = { tool: EditorTool; labelTr: string; labelEn: string; icon: Icon; shortcut?: { tr: string[]; en: string[] } };

export const TOOL_DEFS: ToolDef[] = [
    { tool: "select", labelTr: "Seç", labelEn: "Select", icon: CursorClick, shortcut: { tr: ["Esc"], en: ["Esc"] } },
    { tool: "pan", labelTr: "Kaydır", labelEn: "Pan", icon: HandPalm, shortcut: { tr: ["Boşluk"], en: ["Space"] } },
    { tool: "text", labelTr: "Metin", labelEn: "Text", icon: TextT },
    { tool: "rect", labelTr: "Dikdörtgen", labelEn: "Rectangle", icon: Square },
    { tool: "ellipse", labelTr: "Elips", labelEn: "Ellipse", icon: Circle },
    { tool: "line", labelTr: "Çizgi", labelEn: "Line", icon: Minus },
    { tool: "barcode", labelTr: "Barkod", labelEn: "Barcode", icon: Barcode },
    { tool: "qr", labelTr: "QR kod", labelEn: "QR code", icon: QrCode },
    { tool: "image", labelTr: "Görsel", labelEn: "Image", icon: ImageSquare },
];

/** Name and icon of an element type, shared by the layers list, the inspector and the status bar. */
export function getElementTypeMeta(type: ElementType | EditorTool, locale: string) {
    const def = TOOL_DEFS.find((item) => item.tool === type);
    return {
        label: def ? (locale === "tr" ? def.labelTr : def.labelEn) : type,
        icon: def?.icon ?? Square,
    };
}

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
    const libraryLabel = locale === "tr" ? "Kütüphane" : "Library";

    return (
        <aside className="h-full min-h-0 w-12 shrink-0 border-r border-line bg-surface py-2" aria-label={locale === "tr" ? "Araçlar" : "Tools"}>
            <div className="flex h-full min-h-0 flex-col items-center gap-1">
                {TOOL_DEFS.map((tool, index) => (
                    <div key={tool.tool} className={index === 2 ? "mt-2 border-t border-line pt-2" : undefined}>
                        <EditorToolButton
                            icon={tool.icon}
                            label={locale === "tr" ? tool.labelTr : tool.labelEn}
                            shortcut={tool.shortcut ? (locale === "tr" ? tool.shortcut.tr : tool.shortcut.en) : undefined}
                            active={activeTool === tool.tool}
                            onClick={() => onSelectTool(tool.tool)}
                        />
                    </div>
                ))}
                <div className="mt-2 border-t border-line pt-2">
                    <EditorToolButton icon={FolderOpen} label={libraryLabel} onClick={onOpenLibrary} />
                </div>
            </div>
        </aside>
    );
}
