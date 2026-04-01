"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";
import { fitViewportToContainer, computeSelectionBounds } from "@/components/Editor/editor-actions";
import { 
    Copy, Folders, LockKey, LockKeyOpen, Trash, Export, 
    ArrowUp, ArrowDown, EyeSlash, TextAlignLeft, TextAlignCenter, 
    TextAlignRight, AlignTop, AlignCenterVertical, AlignBottom, 
    Rows, Columns, CaretRight, Stack, Layout,
    MagnifyingGlass, MagnifyingGlassMinus, Eye, Palette, ArrowClockwise, ArrowCounterClockwise, Gear
} from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";

export function EditorContextMenu() {
    const { locale } = useI18n();
    const contextMenu = useEditorStore((state) => state.ui.contextMenu);
    const setContextMenu = useEditorStore((state) => state.setContextMenu);
    const clipboard = useEditorStore((state) => state.clipboard);
    const selection = useEditorStore((state) => state.selection);
    const model = useEditorStore((state) => state.model);
    const viewport = useEditorStore((state) => state.viewport);
    const history = useEditorStore((state) => state.history);
    const ui = useEditorStore((state) => state.ui);
    
    // Actions
    const copySelected = useEditorStore((state) => state.copySelected);
    const pasteClipboard = useEditorStore((state) => state.pasteClipboard);
    const removeSelected = useEditorStore((state) => state.removeSelected);
    const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
    const reorderSelected = useEditorStore((state) => state.reorderSelected);
    const groupSelected = useEditorStore((state) => state.groupSelected);
    const ungroupSelectedGroup = useEditorStore((state) => state.ungroupSelectedGroup);
    const updateSelectedElements = useEditorStore((state) => state.updateSelectedElements);
    const alignSelected = useEditorStore((state) => state.alignSelected);
    const distributeSelected = useEditorStore((state) => state.distributeSelected);
    const setViewport = useEditorStore((state) => state.setViewport);
    const undo = useEditorStore((state) => state.undo);
    const redo = useEditorStore((state) => state.redo);
    const setPreviewMode = useEditorStore((state) => state.setPreviewMode);

    const ref = useRef<HTMLDivElement>(null);
    const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

    // View/Zoom helpers
    const zoomIn = () => setViewport({ zoom: Math.min(4, viewport.zoom + 0.1) });
    const zoomOut = () => setViewport({ zoom: Math.max(0.2, viewport.zoom - 0.1) });
    const resetZoom = () => setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
    
    const fitCanvas = () => {
        const labelWidthPx = UnitConverter.mmToProfile(model.dimensions.widthMm, ScreenPreviewProfile, 1);
        const labelHeightPx = UnitConverter.mmToProfile(model.dimensions.heightMm, ScreenPreviewProfile, 1);
        const newViewport = fitViewportToContainer(labelWidthPx, labelHeightPx, ui.canvasSize.width, ui.canvasSize.height, 48);
        setViewport(newViewport);
    };

    const fitSelection = () => {
        if (selection.selectedElementIds.length === 0) return fitCanvas();
        const bounds = computeSelectionBounds(model, selection.selectedElementIds);
        if (!bounds) return fitCanvas();

        const padding = 48; // px padding
        const availableWidth = Math.max(100, ui.canvasSize.width - padding * 2);
        const availableHeight = Math.max(100, ui.canvasSize.height - padding * 2);

        const boundsWidthPx = UnitConverter.mmToProfile(bounds.widthMm, ScreenPreviewProfile, 1);
        const boundsHeightPx = UnitConverter.mmToProfile(bounds.heightMm, ScreenPreviewProfile, 1);

        const zoom = Math.max(0.2, Math.min(4, Math.min(availableWidth / Math.max(1, boundsWidthPx), availableHeight / Math.max(1, boundsHeightPx))));

        const labelWidthPxZoomed = UnitConverter.mmToProfile(model.dimensions.widthMm, ScreenPreviewProfile, zoom);
        const labelHeightPxZoomed = UnitConverter.mmToProfile(model.dimensions.heightMm, ScreenPreviewProfile, zoom);
        
        const boundsCenterXMm = bounds.xMm + bounds.widthMm / 2;
        const boundsCenterYMm = bounds.yMm + bounds.heightMm / 2;
        
        const centerX = UnitConverter.mmToProfile(boundsCenterXMm, ScreenPreviewProfile, zoom);
        const centerY = UnitConverter.mmToProfile(boundsCenterYMm, ScreenPreviewProfile, zoom);

        const offsetX = labelWidthPxZoomed / 2 - centerX;
        const offsetY = labelHeightPxZoomed / 2 - centerY;

        setViewport({ zoom, offsetX, offsetY });
    };

    useEffect(() => {
        if (!contextMenu) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setContextMenu(null);
            }
        };

        window.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEscape);
        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [contextMenu, setContextMenu]);

    if (!contextMenu) return null;

    const hasSelection = selection.selectedElementIds.length > 0;
    const hasClipboard = clipboard.length > 0;
    const canGroup = selection.selectedElementIds.length > 1;
    
    const selectedElements = model.elements.filter(e => selection.selectedElementIds.includes(e.id));
    const allLocked = selectedElements.length > 0 && selectedElements.every(e => e.locked);
    const allHidden = selectedElements.length > 0 && selectedElements.every(e => e.visible === false);

    // Adjust position if it flows off screen
    let top = contextMenu.y;
    let left = contextMenu.x;
    
    if (typeof window !== "undefined") {
        const menuWidth = 220;
        const menuHeight = 350;
        if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 10;
        if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight - 10;
        if (left < 0) left = 10;
        if (top < 0) top = 10;
    }

    const MenuItem = ({ icon: Icon, label, shortcut, onClick, disabled, hasSubmenu, submenuId }: any) => (
        <button
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs font-semibold text-white transition-colors hover:bg-blue-600/30 disabled:opacity-30 disabled:hover:bg-transparent ${activeSubMenu === submenuId ? "bg-blue-600/20" : ""}`}
            disabled={disabled}
            onMouseEnter={() => submenuId && setActiveSubMenu(submenuId)}
            onClick={onClick}
        >
            {Icon && <Icon size={16} weight="bold" className="text-slate-400" />}
            <span>{label}</span>
            {shortcut && <span className="ml-auto text-[10px] text-slate-500 font-medium">{shortcut}</span>}
            {hasSubmenu && <CaretRight size={12} className="ml-auto text-slate-500" />}
        </button>
    );

    return (
        <div
            ref={ref}
            className="fixed z-[9999] w-52 rounded-xl border border-white/10 bg-[#0f172a]/95 px-1 py-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
            style={{ top, left }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseLeave={() => setActiveSubMenu(null)}
        >
            {/* View Menu */}
            <div className="relative">
                <MenuItem 
                    icon={Gear} 
                    label={locale === "tr" ? "Görünüm" : "View"} 
                    hasSubmenu 
                    submenuId="view"
                />
                {activeSubMenu === "view" && (
                    <div className="absolute left-[calc(100%-8px)] top-0 w-48 rounded-xl border border-white/10 bg-[#0f172a]/95 px-1 py-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-left-1 duration-150">
                        <MenuItem icon={MagnifyingGlass} label={locale === "tr" ? "Yakınlaştır" : "Zoom In"} shortcut="Ctrl++" onClick={() => { zoomIn(); setContextMenu(null); }} />
                        <MenuItem icon={MagnifyingGlassMinus} label={locale === "tr" ? "Uzaklaştır" : "Zoom Out"} shortcut="Ctrl+-" onClick={() => { zoomOut(); setContextMenu(null); }} />
                        <div className="mx-2 my-1 h-px bg-white/5" />
                        <MenuItem icon={Eye} label={locale === "tr" ? "Sığdır" : "Fit Canvas"} shortcut="Ctrl+Shift+1" onClick={() => { fitCanvas(); setContextMenu(null); }} />
                        <MenuItem icon={Eye} label={locale === "tr" ? "Seçimi Sığdır" : "Fit Selection"} shortcut="Ctrl+Shift+2" onClick={() => { fitSelection(); setContextMenu(null); }} />
                        <MenuItem label={locale === "tr" ? "100%" : "Reset (100%)"} onClick={() => { resetZoom(); setContextMenu(null); }} />
                        <div className="mx-2 my-1 h-px bg-white/5" />
                        <MenuItem icon={Palette} label={locale === "tr" ? "Açık" : "Light"} onClick={() => { setPreviewMode("light"); setContextMenu(null); }} />
                        <MenuItem icon={Palette} label={locale === "tr" ? "Koyu" : "Dark"} onClick={() => { setPreviewMode("dark"); setContextMenu(null); }} />
                        <MenuItem icon={Palette} label={locale === "tr" ? "Satranç" : "Checkerboard"} onClick={() => { setPreviewMode("checkerboard"); setContextMenu(null); }} />
                    </div>
                )}
            </div>

            <div className="mx-2 my-1 h-px bg-white/5" />

            {/* Undo/Redo */}
            <MenuItem 
                icon={ArrowCounterClockwise} 
                label={locale === "tr" ? "Geri Al" : "Undo"} 
                shortcut="Ctrl+Z" 
                disabled={history.past.length === 0}
                onClick={() => { undo(); setContextMenu(null); }} 
            />
            <MenuItem 
                icon={ArrowClockwise} 
                label={locale === "tr" ? "Yinele" : "Redo"} 
                shortcut="Ctrl+Y" 
                disabled={history.future.length === 0}
                onClick={() => { redo(); setContextMenu(null); }} 
            />

            <div className="mx-2 my-1 h-px bg-white/5" />

            {/* Existing Edit Menu */}
            {!hasSelection ? (
                <MenuItem 
                    icon={Export} 
                    label={locale === "tr" ? "Yapıştır" : "Paste"} 
                    shortcut="Ctrl+V" 
                    disabled={!hasClipboard}
                    onClick={() => { pasteClipboard(); setContextMenu(null); }} 
                />
            ) : (
                <>
                    <MenuItem 
                        icon={Copy} 
                        label={locale === "tr" ? "Kopyala" : "Copy"} 
                        shortcut="Ctrl+C" 
                        onClick={() => { copySelected(); setContextMenu(null); }} 
                    />
                    <MenuItem 
                        icon={Export} 
                        label={locale === "tr" ? "Yapıştır" : "Paste"} 
                        shortcut="Ctrl+V" 
                        disabled={!hasClipboard}
                        onClick={() => { pasteClipboard(); setContextMenu(null); }} 
                    />
                    <MenuItem 
                        icon={Folders} 
                        label={locale === "tr" ? "Çoğalt" : "Duplicate"} 
                        shortcut="Ctrl+D" 
                        onClick={() => { duplicateSelected(); setContextMenu(null); }} 
                    />
                    
                    <div className="mx-2 my-1 h-px bg-white/5" />

                    <div className="relative">
                        <MenuItem 
                            icon={Stack} 
                            label={locale === "tr" ? "Sıralama" : "Arrange"} 
                            hasSubmenu 
                            submenuId="arrange"
                        />
                        {activeSubMenu === "arrange" && (
                            <div className="absolute left-[calc(100%-8px)] top-0 w-48 rounded-xl border border-white/10 bg-[#0f172a]/95 px-1 py-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-left-1 duration-150">
                                <MenuItem icon={ArrowUp} label={locale === "tr" ? "En Öne Getir" : "Bring to Front"} shortcut="Ctrl+Shift+]" onClick={() => { reorderSelected("front"); setContextMenu(null); }} />
                                <MenuItem icon={ArrowDown} label={locale === "tr" ? "En Arkaya Gönder" : "Send to Back"} shortcut="Ctrl+Shift+[" onClick={() => { reorderSelected("back"); setContextMenu(null); }} />
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <MenuItem 
                            icon={Layout} 
                            label={locale === "tr" ? "Hizalama" : "Alignment"} 
                            hasSubmenu 
                            submenuId="align"
                        />
                        {activeSubMenu === "align" && (
                            <div className="absolute left-[calc(100%-8px)] top-0 w-48 rounded-xl border border-white/10 bg-[#0f172a]/95 px-1 py-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-left-1 duration-150">
                                <MenuItem icon={TextAlignLeft} label={locale === "tr" ? "Sola Hizala" : "Align Left"} onClick={() => { alignSelected("left"); setContextMenu(null); }} />
                                <MenuItem icon={TextAlignCenter} label={locale === "tr" ? "Yatay Orta" : "Horizontal Center"} onClick={() => { alignSelected("center-horizontal"); setContextMenu(null); }} />
                                <MenuItem icon={TextAlignRight} label={locale === "tr" ? "Sağa Hizala" : "Align Right"} onClick={() => { alignSelected("right"); setContextMenu(null); }} />
                                <div className="mx-2 my-1 h-px bg-white/5" />
                                <MenuItem icon={AlignTop} label={locale === "tr" ? "Üste Hizala" : "Align Top"} onClick={() => { alignSelected("top"); setContextMenu(null); }} />
                                <MenuItem icon={AlignCenterVertical} label={locale === "tr" ? "Dikey Orta" : "Vertical Middle"} onClick={() => { alignSelected("middle"); setContextMenu(null); }} />
                                <MenuItem icon={AlignBottom} label={locale === "tr" ? "Alta Hizala" : "Align Bottom"} onClick={() => { alignSelected("bottom"); setContextMenu(null); }} />
                                {selection.selectedElementIds.length >= 3 && (
                                    <>
                                        <div className="mx-2 my-1 h-px bg-white/5" />
                                        <MenuItem icon={Columns} label={locale === "tr" ? "Yatay Dağıt" : "Distribute H"} onClick={() => { distributeSelected("horizontal"); setContextMenu(null); }} />
                                        <MenuItem icon={Rows} label={locale === "tr" ? "Dikey Dağıt" : "Distribute V"} onClick={() => { distributeSelected("vertical"); setContextMenu(null); }} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mx-2 my-1 h-px bg-white/5" />

                    <MenuItem 
                        icon={allLocked ? LockKeyOpen : LockKey} 
                        label={allLocked ? (locale === "tr" ? "Kilidi Aç" : "Unlock") : (locale === "tr" ? "Kilitle" : "Lock")} 
                        onClick={() => { updateSelectedElements({ locked: !allLocked }); setContextMenu(null); }} 
                    />
                    <MenuItem 
                        icon={EyeSlash} 
                        label={allHidden ? (locale === "tr" ? "Göster" : "Show") : (locale === "tr" ? "Gizle" : "Hide")} 
                        onClick={() => { updateSelectedElements({ visible: allHidden }); setContextMenu(null); }} 
                    />

                    <div className="mx-2 my-1 h-px bg-white/5" />

                    <MenuItem 
                        label={locale === "tr" ? "Grupla" : "Group"} 
                        shortcut="Ctrl+G"
                        disabled={!canGroup}
                        onClick={() => { groupSelected(); setContextMenu(null); }} 
                    />
                    <MenuItem 
                        label={locale === "tr" ? "Grubu Çöz" : "Ungroup"} 
                        shortcut="Ctrl+Shift+G"
                        onClick={() => { ungroupSelectedGroup(); setContextMenu(null); }} 
                    />
                    
                    <div className="mx-2 my-1 h-px bg-white/5" />

                    <MenuItem 
                        icon={Trash} 
                        label={locale === "tr" ? "Sil" : "Delete"} 
                        shortcut="Del"
                        onClick={() => { removeSelected(); setContextMenu(null); }} 
                    />
                </>
            )}
        </div>
    );
}

