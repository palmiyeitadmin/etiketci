"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AssetLibraryDrawer } from "@/components/Editor/AssetLibraryDrawer";
import { EditorInspector } from "@/components/Editor/EditorInspector";
import { EditorLayersPanel } from "@/components/Editor/EditorLayersPanel";
import { EditorToolRail } from "@/components/Editor/EditorToolRail";
import { EditorTopBar } from "@/components/Editor/EditorTopBar";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { computeSelectionBounds, fitViewportToContainer, renameModel, resizeModelCanvas } from "@/components/Editor/editor-actions";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { useEditorModel, useEditorSelection, useEditorViewport, useEditorUI, useEditorIsDirty } from "./editor-selectors";
import { EditorContextMenu } from "@/components/Editor/EditorContextMenu";
import { ShortcutsHelpModal } from "@/components/Editor/ShortcutsHelpModal";
import { TemplatesLibraryDrawer } from "@/components/Editor/TemplatesLibraryDrawer";
import { EditorHistoryPanel } from "@/components/Editor/EditorHistoryPanel";
import { createDefaultElement } from "@/lib/editor-canonical";
import { normalizeCanonicalLabelModel } from "@/lib/editor-canonical";
import { EDITOR_NUDGE_MM, EDITOR_NUDGE_SHIFT_MM, ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";
import { CanonicalLabelModel, ImageElement } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";

const CanvasStage = dynamic(
  () => import("@/components/Editor/EditorCanvasStage").then((module) => module.EditorCanvasStage),
  { ssr: false }
);

interface EditorShellProps {
  initialModel: CanonicalLabelModel;
  onSave: (model: CanonicalLabelModel) => Promise<EditorSaveResult>;
  previewHref?: string;
  onRenameTemplate?: (name: string, model: CanonicalLabelModel) => Promise<void>;
}

type RightPanelTab = "layers" | "properties" | "history";

function isInteractiveTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(element.tagName) || element.isContentEditable;
}

export function EditorShell({ initialModel, onSave, previewHref, onRenameTemplate }: EditorShellProps) {
    const { locale } = useI18n();
    const initialize = useEditorStore((state) => state.initialize);

    // Use optimized selectors to prevent unnecessary re-renders
    const model = useEditorModel();
    const selection = useEditorSelection();
    const viewport = useEditorViewport();
    const ui = useEditorUI();
    const isDirty = useEditorStore((state) => state.isDirty);
    
    // Only subscribe to specific methods we need
    const setTool = useEditorStore((state) => state.setTool);
    const setViewport = useEditorStore((state) => state.setViewport);
    const clearSelection = useEditorStore((state) => state.clearSelection);
    const setActiveEditingGroup = useEditorStore((state) => state.setActiveEditingGroup);
    const setSpacePanning = useEditorStore((state) => state.setSpacePanning);
    const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
    const removeSelected = useEditorStore((state) => state.removeSelected);
    const reorderSelected = useEditorStore((state) => state.reorderSelected);
    const nudgeSelected = useEditorStore((state) => state.nudgeSelected);
    const undo = useEditorStore((state) => state.undo);
    const redo = useEditorStore((state) => state.redo);
    const copySelected = useEditorStore((state) => state.copySelected);
    const pasteClipboard = useEditorStore((state) => state.pasteClipboard);
    const setHelpOpen = useEditorStore((state) => state.setHelpOpen);
    const markSaved = useEditorStore((state) => state.markSaved);
    const applyModel = useEditorStore((state) => state.applyModel);
    const setShowGrid = useEditorStore((state) => state.setShowGrid);
    const insertElement = useEditorStore((state) => state.insertElement);
    const rotateSelected = useEditorStore((state) => state.rotateSelected);
    const groupSelected = useEditorStore((state) => state.groupSelected);
    const ungroupSelectedGroup = useEditorStore((state) => state.ungroupSelectedGroup);
    const previewMode = useEditorStore((state) => state.ui.previewMode);
    const setPreviewMode = useEditorStore((state) => state.setPreviewMode);

    // Toast notifications
    const { addToast } = useToast();

  const [savePending, setSavePending] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("layers");
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    initialize(normalizeCanonicalLabelModel(initialModel, initialModel.name || "Untitled Template"));
  }, [initialModel, initialize]);

  useEffect(() => {
    if (selection.selectedElementIds.length > 0) {
      setRightPanelTab("properties");
    }
  }, [selection.selectedElementIds.length]);

  const fitCanvas = useCallback(() => {
    const labelWidthPx = UnitConverter.mmToProfile(model.dimensions.widthMm, ScreenPreviewProfile, 1);
    const labelHeightPx = UnitConverter.mmToProfile(model.dimensions.heightMm, ScreenPreviewProfile, 1);
    setViewport(fitViewportToContainer(labelWidthPx, labelHeightPx, ui.canvasSize.width, ui.canvasSize.height, 48));
  }, [model.dimensions.heightMm, model.dimensions.widthMm, setViewport, ui.canvasSize.height, ui.canvasSize.width]);

  const fitSelection = useCallback(() => {
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
    
    // Bounds center in mm
    const boundsCenterXMm = bounds.xMm + bounds.widthMm / 2;
    const boundsCenterYMm = bounds.yMm + bounds.heightMm / 2;
    
    // Bounds center relative to label origin (0,0) with new zoom
    const centerX = UnitConverter.mmToProfile(boundsCenterXMm, ScreenPreviewProfile, zoom);
    const centerY = UnitConverter.mmToProfile(boundsCenterYMm, ScreenPreviewProfile, zoom);

    const offsetX = labelWidthPxZoomed / 2 - centerX;
    const offsetY = labelHeightPxZoomed / 2 - centerY;

    setViewport({ zoom, offsetX, offsetY });
  }, [model, selection.selectedElementIds, setViewport, ui.canvasSize.height, ui.canvasSize.width, fitCanvas]);

  const resetViewport = useCallback(() => {
    setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
  }, [setViewport]);

  const zoomIn = useCallback(() => setViewport({ zoom: Math.min(4, viewport.zoom + 0.1) }), [setViewport, viewport.zoom]);
  const zoomOut = useCallback(() => setViewport({ zoom: Math.max(0.2, viewport.zoom - 0.1) }), [setViewport, viewport.zoom]);

    const handleSave = useCallback(async () => {
        // Prevent overlapping saves
        if (savePending) return;
        
        setSavePending(true);
        try {
            const result = await onSave(model);
            if (result.ok) {
                markSaved();
                addToast({
                    type: 'success',
                    message: locale === "tr" ? 'Sablon kaydedildi' : 'Template saved successfully',
                    duration: 3000,
                });
            } else {
                addToast({
                    type: 'error',
                    message: result.message || (locale === "tr" ? 'Kaydet hatası' : 'Failed to save template'),
                    duration: 5000,
                    action: {
                        label: locale === "tr" ? 'Tekrar deneyin' : 'Try again',
                        onClick: () => {
                            // Re-try with toast notification
                        },
                    },
                });
            }
        } catch (error) {
            addToast({
                type: 'error',
                message: locale === "tr" ? 'Kaydet sırasında hata oluştu' : 'An unexpected error occurred while saving',
                duration: 5000,
            });
        } finally {
            setSavePending(false);
        }
    }, [model, isDirty, markSaved, model, onSave, savePending, addToast]);

  // Debounced auto-save (5 seconds)
  useEffect(() => {
    if (!isDirty) return;

    const handler = setTimeout(() => {
        void handleSave();
    }, 5000);

    return () => clearTimeout(handler);
  }, [isDirty, model, handleSave]);

  const handleRenameTemplate = useCallback(async (name: string) => {
    const nextModel = renameModel(model, name);
    if (onRenameTemplate) {
      await onRenameTemplate(name, nextModel);
    } else {
      const result = await onSave(nextModel);
      if (!result.ok) {
        throw new Error(result.message);
      }
    }

    applyModel(nextModel, { recordHistory: false, dirty: false });
    markSaved();
  }, [applyModel, markSaved, model, onRenameTemplate, onSave]);

  const handleResizeCanvas = useCallback(async (dimensions: { widthMm: number; heightMm: number }) => {
    const nextModel = resizeModelCanvas(model, dimensions);
    const result = await onSave(nextModel);
    if (!result.ok) {
      throw new Error(result.message);
    }

    applyModel(nextModel, { recordHistory: false, dirty: false });
    markSaved();
  }, [applyModel, markSaved, model, onSave]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      const interactive = isInteractiveTarget(event.target);

      if (event.code === "Space" && !interactive) {
        event.preventDefault();
        setSpacePanning(true);
      }

      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSave();
        return;
      }

      if (meta && event.key.toLowerCase() === "c") {
        if (!interactive) {
          event.preventDefault();
          copySelected();
          return;
        }
      }

      if (meta && event.key.toLowerCase() === "v") {
        if (!interactive) {
          event.preventDefault();
          pasteClipboard();
          return;
        }
      }

      if (meta && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        redo();
        return;
      }

      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (meta && event.key.toLowerCase() === "g" && !event.shiftKey) {
        event.preventDefault();
        groupSelected();
        return;
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        ungroupSelectedGroup();
        return;
      }

      if (meta && event.key === "1") {
        event.preventDefault();
        fitSelection();
        return;
      }

      if (interactive) {
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        rotateSelected(event.shiftKey ? "left" : "right");
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (ui.contextMenu) {
            useEditorStore.getState().setContextMenu(null);
            return;
        }
        if (ui.isHelpOpen) {
            setHelpOpen(false);
            return;
        }
        if (selection.activeEditingGroupId) {
          setActiveEditingGroup(null);
        } else {
          clearSelection();
        }
        setTool("select");
        return;
      }

      const step = event.shiftKey ? EDITOR_NUDGE_SHIFT_MM : EDITOR_NUDGE_MM;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelected(-step, 0);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelected(step, 0);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelected(0, -step);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelected(0, step);
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        reorderSelected(event.shiftKey ? "back" : "backward");
        return;
      }
      if (event.key === "]") {
        event.preventDefault();
        reorderSelected(event.shiftKey ? "front" : "forward");
        return;
      }

      if (event.key === "?" || event.key === "F1") {
        if (!interactive) {
          event.preventDefault();
          setHelpOpen(true);
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpacePanning(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSelection, duplicateSelected, groupSelected, handleSave, nudgeSelected, redo, removeSelected, reorderSelected, rotateSelected, selection.activeEditingGroupId, setActiveEditingGroup, setSpacePanning, setTool, undo, ungroupSelectedGroup, copySelected, pasteClipboard, setHelpOpen, ui.contextMenu, ui.isHelpOpen]);

  const insertImageFromLibrary = useCallback((payload: { name: string; content: string; assetId?: string; assetSource?: "upload" | "phosphor"; assetKey?: string }) => {
    const nextIndex = model.elements.filter((element) => element.type === "image").length + 1;
    const element = createDefaultElement("image", nextIndex, {
      xMm: Math.max(4, (model.dimensions.widthMm - (payload.assetSource === "phosphor" ? 16 : 24)) / 2),
      yMm: Math.max(4, (model.dimensions.heightMm - (payload.assetSource === "phosphor" ? 16 : 24)) / 2),
    }) as ImageElement;
    element.name = payload.name;
    element.content = payload.content;
    element.widthMm = payload.assetSource === "phosphor" ? 16 : 24;
    element.heightMm = payload.assetSource === "phosphor" ? 16 : 24;
    element.assetId = payload.assetId;
    element.assetSource = payload.assetSource;
    element.assetKey = payload.assetKey;
    insertElement(element);
    setLibraryOpen(false);
  }, [insertElement, model.dimensions.heightMm, model.dimensions.widthMm, model.elements]);

  const layoutClassName = panelsCollapsed
    ? "grid min-h-0 flex-1 overflow-hidden overscroll-none grid-cols-[4rem_minmax(0,1fr)] xl:grid-cols-[4rem_minmax(0,1fr)]"
    : "grid min-h-0 flex-1 overflow-hidden overscroll-none grid-cols-[4rem_minmax(0,1fr)] xl:grid-cols-[4rem_minmax(0,1fr)_22rem] 2xl:grid-cols-[4rem_minmax(0,1fr)_20rem_22rem]";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none bg-[#08111f] text-white">
      <AssetLibraryDrawer open={libraryOpen} onClose={() => setLibraryOpen(false)} onInsertImage={insertImageFromLibrary} />
      <TemplatesLibraryDrawer open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <EditorContextMenu />
      <ShortcutsHelpModal isOpen={ui.isHelpOpen} onClose={() => setHelpOpen(false)} />
      <EditorTopBar
        name={model.name}
        dimensions={model.dimensions}
        previewHref={previewHref}
        isDirty={isDirty || savePending}
        onSave={() => void handleSave()}
        onRenameTemplate={onRenameTemplate ? (name) => onRenameTemplate(name, model) : undefined}
        onResizeCanvas={handleResizeCanvas}
        onToggleHelp={() => setHelpOpen(!ui.isHelpOpen)}
      />

      <div className={layoutClassName}>
        <EditorToolRail 
          activeTool={ui.activeTool} 
          onSelectTool={setTool} 
          onOpenLibrary={() => setLibraryOpen(true)} 
          onOpenTemplates={() => setTemplatesOpen(true)}
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0b1220]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--plms-border)] px-4 py-3 xl:px-6">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                {ui.isSpacePanning || ui.activeTool === "pan"
                  ? (locale === "tr" ? "Kaydirma modu" : "Pan mode")
                  : ui.activeTool === "select"
                    ? (locale === "tr" ? "Secim modu" : "Select mode")
                    : (locale === "tr" ? `Tuvale ${ui.activeTool} yerlestirmek icin tiklayin` : `Click canvas to place ${ui.activeTool}`)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${ui.showGrid ? "border-blue-400/30 bg-blue-500/10 text-white" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] text-[color:var(--plms-text-subtle)] hover:bg-white/5 hover:text-white"}`}
                onClick={() => setShowGrid(!ui.showGrid)}
                title={locale === "tr" ? "Izgarayi goster/gizle" : "Toggle grid"}
              >
                {locale === "tr" ? "Izgara" : "Grid"}
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${!panelsCollapsed && rightPanelTab === "layers" ? "border-blue-400/30 bg-blue-500/10 text-white" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] text-[color:var(--plms-text-subtle)] hover:bg-white/5 hover:text-white"}`}
                onClick={() => {
                  setPanelsCollapsed(false);
                  setRightPanelTab("layers");
                }}
              >
                {locale === "tr" ? "Katmanlar" : "Layers"}
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${!panelsCollapsed && rightPanelTab === "properties" ? "border-blue-400/30 bg-blue-500/10 text-white" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] text-[color:var(--plms-text-subtle)] hover:bg-white/5 hover:text-white"}`}
                onClick={() => {
                  setPanelsCollapsed(false);
                  setRightPanelTab("properties");
                }}
              >
                {locale === "tr" ? "Ozellikler" : "Properties"}
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${!panelsCollapsed && rightPanelTab === "history" ? "border-blue-400/30 bg-blue-500/10 text-white" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] text-[color:var(--plms-text-subtle)] hover:bg-white/5 hover:text-white"}`}
                onClick={() => {
                  setPanelsCollapsed(false);
                  setRightPanelTab("history");
                }}
              >
                {locale === "tr" ? "Gecmis" : "History"}
              </button>
              <button
                type="button"
                className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)] transition-colors hover:bg-white/5 hover:text-white"
                onClick={() => setPanelsCollapsed((current) => !current)}
              >
                {panelsCollapsed ? (locale === "tr" ? "Panelleri Goster" : "Show Panels") : (locale === "tr" ? "Panelleri Gizle" : "Hide Panels")}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <CanvasStage />
          </div>
        </section>

        {!panelsCollapsed ? (
          <>
            {/* XL Breakpoint: Single panel visible */}
            <div className="hidden h-full min-h-0 overflow-hidden overscroll-none xl:block 2xl:hidden">
              {rightPanelTab === "layers" && <EditorLayersPanel className="h-full w-[22rem]" />}
              {rightPanelTab === "properties" && <EditorInspector className="h-full w-[22rem]" />}
              {rightPanelTab === "history" && <EditorHistoryPanel />}
            </div>

            {/* 2XL Breakpoint: Dual panels visible */}
            <div className="hidden h-full min-h-0 overflow-hidden overscroll-none 2xl:block">
              {rightPanelTab === "history" ? (
                <EditorHistoryPanel />
              ) : (
                <EditorLayersPanel className="h-full w-[20rem]" />
              )}
            </div>
            <div className="hidden h-full min-h-0 overflow-hidden overscroll-none 2xl:block">
              <EditorInspector className="h-full w-[22rem]" />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
