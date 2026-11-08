"use client";

import { Barcode, Circle, CursorClick, FolderOpen, HandPalm, Icon, ImageSquare, Minus, QrCode, Square, TextT } from "@phosphor-icons/react";
import { EditorToolButton } from "@/components/Editor/EditorIconButton";
import { EditorTool, ElementType } from "@/types/canvas";
import { getText, useText, type Locale } from "@/lib/i18n";

type ToolDef = { tool: EditorTool; icon: Icon; shortcut?: "esc" | "space" };

export const TOOL_DEFS: ToolDef[] = [
    { tool: "select", icon: CursorClick, shortcut: "esc" },
    { tool: "pan", icon: HandPalm, shortcut: "space" },
    { tool: "text", icon: TextT },
    { tool: "rect", icon: Square },
    { tool: "ellipse", icon: Circle },
    { tool: "line", icon: Minus },
    { tool: "barcode", icon: Barcode },
    { tool: "qr", icon: QrCode },
    { tool: "image", icon: ImageSquare },
];

/** Name and icon of an element type, shared by the layers list, the inspector and the status bar. */
export function getElementTypeMeta(type: ElementType | EditorTool, locale: Locale) {
    const def = TOOL_DEFS.find((item) => item.tool === type);
    return {
        label: def ? getText("editor", locale).toolRail.tools[def.tool] : type,
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
    const text = useText("editor").toolRail;

    return (
        <aside className="h-full min-h-0 w-12 shrink-0 border-r border-line bg-surface py-2" aria-label={text.label}>
            <div className="flex h-full min-h-0 flex-col items-center gap-1">
                {TOOL_DEFS.map((tool, index) => (
                    <div key={tool.tool} className={index === 2 ? "mt-2 border-t border-line pt-2" : undefined}>
                        <EditorToolButton
                            icon={tool.icon}
                            label={text.tools[tool.tool]}
                            shortcut={tool.shortcut ? [text.keys[tool.shortcut]] : undefined}
                            active={activeTool === tool.tool}
                            onClick={() => onSelectTool(tool.tool)}
                        />
                    </div>
                ))}
                <div className="mt-2 border-t border-line pt-2">
                    <EditorToolButton icon={FolderOpen} label={text.library} onClick={onOpenLibrary} />
                </div>
            </div>
        </aside>
    );
}
