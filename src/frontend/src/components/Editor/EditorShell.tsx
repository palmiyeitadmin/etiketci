"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AssetLibraryDrawer } from "@/components/Editor/AssetLibraryDrawer";
import { EditorInspector } from "@/components/Editor/EditorInspector";
import { EditorLayersPanel } from "@/components/Editor/EditorLayersPanel";
import { EditorToolRail } from "@/components/Editor/EditorToolRail";
import { EditorTopBar } from "@/components/Editor/EditorTopBar";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { fitViewportToContainer, renameModel, resizeModelCanvas } from "@/components/Editor/editor-actions";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { createDefaultElement } from "@/lib/editor-canonical";
import { normalizeCanonicalLabelModel } from "@/lib/editor-canonical";
import { EDITOR_NUDGE_MM, EDITOR_NUDGE_SHIFT_MM, ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";
import { CanonicalLabelModel, ImageElement } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";

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

type RightPanelTab = "layers" | "properties";

function isInteractiveTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(element.tagName) || element.isContentEditable;
}

export function EditorShell({ initialModel, onSave, previewHref, onRenameTemplate }: EditorShellProps) {
  const { locale } = useI18n();
  const initialize = useEditorStore((state) => state.initialize);
  const model = useEditorStore((state) => state.model);
  const selection = useEditorStore((state) => state.selection);
  const history = useEditorStore((state) => state.history);
  const viewport = useEditorStore((state) => state.viewport);
  const ui = useEditorStore((state) => state.ui);
  const isDirty = useEditorStore((state) => state.isDirty);
  const setTool = useEditorStore((state) => state.setTool);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setSelectedElementId = useEditorStore((state) => state.setSelectedElementId);
  const setSpacePanning = useEditorStore((state) => state.setSpacePanning);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const removeSelected = useEditorStore((state) => state.removeSelected);
  const reorderSelected = useEditorStore((state) => state.reorderSelected);
  const nudgeSelected = useEditorStore((state) => state.nudgeSelected);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const markSaved = useEditorStore((state) => state.markSaved);
  const applyModel = useEditorStore((state) => state.applyModel);
  const insertElement = useEditorStore((state) => state.insertElement);
  const rotateSelected = useEditorStore((state) => state.rotateSelected);

  const [savePending, setSavePending] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("layers");
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    initialize(normalizeCanonicalLabelModel(initialModel, initialModel.name || "Untitled Template"));
  }, [initialModel, initialize]);

  useEffect(() => {
    if (selection.selectedElementId) {
      setRightPanelTab("properties");
    }
  }, [selection.selectedElementId]);

  const fitCanvas = useCallback(() => {
    const labelWidthPx = UnitConverter.mmToProfile(model.dimensions.widthMm, ScreenPreviewProfile, 1);
    const labelHeightPx = UnitConverter.mmToProfile(model.dimensions.heightMm, ScreenPreviewProfile, 1);
    setViewport(fitViewportToContainer(labelWidthPx, labelHeightPx, ui.canvasSize.width, ui.canvasSize.height, 48));
  }, [model.dimensions.heightMm, model.dimensions.widthMm, setViewport, ui.canvasSize.height, ui.canvasSize.width]);

  const resetViewport = useCallback(() => {
    setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
  }, [setViewport]);

  const zoomIn = useCallback(() => setViewport({ zoom: Math.min(4, viewport.zoom + 0.1) }), [setViewport, viewport.zoom]);
  const zoomOut = useCallback(() => setViewport({ zoom: Math.max(0.2, viewport.zoom - 0.1) }), [setViewport, viewport.zoom]);

  const handleSave = useCallback(async () => {
    setSavePending(true);
    try {
      const result = await onSave(model);
      if (result.ok) {
        markSaved();
      }
    } finally {
      setSavePending(false);
    }
  }, [markSaved, model, onSave]);

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
        setSelectedElementId(null);
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
  }, [duplicateSelected, handleSave, nudgeSelected, redo, removeSelected, reorderSelected, rotateSelected, setSelectedElementId, setSpacePanning, setTool, undo]);

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

  const selectedLabel = useMemo(() => model.elements.find((element) => element.id === selection.selectedElementId) ?? null, [model.elements, selection.selectedElementId]);
  const layoutClassName = panelsCollapsed
    ? "grid min-h-0 flex-1 overflow-hidden overscroll-none grid-cols-[4rem_minmax(0,1fr)] xl:grid-cols-[4rem_minmax(0,1fr)]"
    : "grid min-h-0 flex-1 overflow-hidden overscroll-none grid-cols-[4rem_minmax(0,1fr)] xl:grid-cols-[4rem_minmax(0,1fr)_22rem] 2xl:grid-cols-[4rem_minmax(0,1fr)_20rem_22rem]";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none bg-[#08111f] text-white">
      <AssetLibraryDrawer open={libraryOpen} onClose={() => setLibraryOpen(false)} onInsertImage={insertImageFromLibrary} />
      <EditorTopBar
        name={model.name}
        dimensions={model.dimensions}
        zoom={viewport.zoom}
        previewHref={previewHref}
        isDirty={isDirty || savePending}
        onSave={() => void handleSave()}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fitCanvas}
        onReset={resetViewport}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onDuplicate={duplicateSelected}
        onDelete={removeSelected}
        onRotateLeft={() => rotateSelected("left")}
        onRotateRight={() => rotateSelected("right")}
        onRenameTemplate={handleRenameTemplate}
        onResizeCanvas={handleResizeCanvas}
      />

      <div className={layoutClassName}>
        <EditorToolRail activeTool={ui.activeTool} onSelectTool={setTool} onOpenLibrary={() => setLibraryOpen(true)} />

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
              {selectedLabel ? (
                <div className="mt-2 max-w-full truncate rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">
                  {selectedLabel.name || selectedLabel.type} | {selectedLabel.xMm}mm / {selectedLabel.yMm}mm
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="hidden h-full min-h-0 overflow-hidden overscroll-none xl:block 2xl:hidden">
              {rightPanelTab === "layers" ? (
                <EditorLayersPanel className="h-full w-[22rem]" />
              ) : (
                <EditorInspector className="h-full w-[22rem]" />
              )}
            </div>
            <div className="hidden h-full min-h-0 overflow-hidden overscroll-none 2xl:block">
              <EditorLayersPanel className="h-full w-[20rem]" />
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
