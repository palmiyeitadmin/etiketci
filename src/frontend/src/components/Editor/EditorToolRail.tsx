"use client";

import { Barcode, Circle, CursorClick, FolderOpen, HandPalm, ImageSquare, Minus, QrCode, Square, TextT } from "@phosphor-icons/react";
import { EditorToolButton } from "@/components/Editor/EditorIconButton";
import { EditorTool } from "@/types/canvas";

const TOOL_DEFS: Array<{ tool: EditorTool; label: string; icon: any }> = [
    { tool: "select", label: "Select", icon: CursorClick },
    { tool: "pan", label: "Pan", icon: HandPalm },
    { tool: "text", label: "Text", icon: TextT },
    { tool: "rect", label: "Rectangle", icon: Square },
    { tool: "ellipse", label: "Oval", icon: Circle },
    { tool: "line", label: "Line", icon: Minus },
    { tool: "barcode", label: "Barcode", icon: Barcode },
    { tool: "qr", label: "QR Code", icon: QrCode },
    { tool: "image", label: "Image", icon: ImageSquare },
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
    return (
        <aside className="h-full min-h-0 w-16 shrink-0 overflow-hidden border-r border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-2 py-3">
            <div className="custom-scrollbar flex h-full min-h-0 flex-col items-center gap-2 overflow-y-auto overscroll-contain pb-4">
            {TOOL_DEFS.map((tool) => (
                <EditorToolButton
                    key={tool.tool}
                    icon={tool.icon}
                    label={tool.label}
                    active={activeTool === tool.tool}
                    onClick={() => onSelectTool(tool.tool)}
                />
            ))}
            <div className="my-1 h-px w-10 bg-[color:var(--plms-border)]" />
            <EditorToolButton icon={FolderOpen} label="Library" onClick={onOpenLibrary} />
            </div>
        </aside>
    );
}
