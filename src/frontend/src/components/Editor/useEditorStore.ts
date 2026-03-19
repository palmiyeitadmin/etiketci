import { create } from "zustand";
import { cloneCanonicalModel, normalizeCanonicalLabelModel } from "@/lib/editor-canonical";
import { EditorHistoryState, EditorSelectionState, EditorTool, EditorViewport, CanonicalLabelModel, LabelElement } from "@/types/canvas";
import { addElementToModel, duplicateElementInModel, findNextSelectionId, insertElementIntoModel, nudgeElementInModel, removeElementFromModel, reorderElementInModel, updateElementInModel } from "@/components/Editor/editor-actions";

interface EditorUiState {
    activeTool: EditorTool;
    isSpacePanning: boolean;
    variablePickerOpen: boolean;
    inspectorMessage?: string | null;
    canvasSize: { width: number; height: number };
}

interface EditorStoreState {
    model: CanonicalLabelModel;
    selection: EditorSelectionState;
    history: EditorHistoryState;
    viewport: EditorViewport;
    ui: EditorUiState;
    isDirty: boolean;
    initialized: boolean;
    initialize: (model: CanonicalLabelModel) => void;
    setTool: (tool: EditorTool) => void;
    setSelectedElementId: (id: string | null) => void;
    setViewport: (viewport: Partial<EditorViewport>) => void;
    setSpacePanning: (active: boolean) => void;
    setVariablePickerOpen: (open: boolean) => void;
    setInspectorMessage: (message: string | null) => void;
    setCanvasSize: (width: number, height: number) => void;
    captureHistory: () => void;
    applyModel: (nextModel: CanonicalLabelModel, options?: { recordHistory?: boolean; dirty?: boolean }) => void;
    addElement: (type: EditorTool, position?: { xMm: number; yMm: number }) => string | null;
    insertElement: (element: LabelElement) => string;
    updateElement: (id: string, updates: Partial<LabelElement>, options?: { recordHistory?: boolean }) => void;
    removeElement: (id: string) => void;
    duplicateElement: (id: string) => void;
    reorderElement: (id: string, mode: "forward" | "backward" | "front" | "back") => void;
    removeSelected: () => void;
    duplicateSelected: () => void;
    reorderSelected: (mode: "forward" | "backward" | "front" | "back") => void;
    nudgeSelected: (deltaXmm: number, deltaYmm: number) => void;
    rotateSelected: (direction: "left" | "right") => void;
    undo: () => void;
    redo: () => void;
    markSaved: () => void;
}

const EMPTY_MODEL = normalizeCanonicalLabelModel(undefined, "Untitled Template");

export const useEditorStore = create<EditorStoreState>((set, get) => ({
    model: EMPTY_MODEL,
    selection: { selectedElementId: null },
    history: { past: [], future: [] },
    viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
    ui: { activeTool: "select", isSpacePanning: false, variablePickerOpen: false, inspectorMessage: null, canvasSize: { width: 1200, height: 800 } },
    isDirty: false,
    initialized: false,
    initialize: (model) => {
        const normalized = normalizeCanonicalLabelModel(model, model.name || "Untitled Template");
        set({
            model: normalized,
            selection: { selectedElementId: normalized.elements[0]?.id ?? null },
            history: { past: [], future: [] },
            viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
            ui: { activeTool: "select", isSpacePanning: false, variablePickerOpen: false, inspectorMessage: null, canvasSize: { width: 1200, height: 800 } },
            isDirty: false,
            initialized: true,
        });
    },
    setTool: (tool) => set((state) => ({ ui: { ...state.ui, activeTool: tool } })),
    setSelectedElementId: (id) => set({ selection: { selectedElementId: id } }),
    setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
    setSpacePanning: (active) => set((state) => ({ ui: { ...state.ui, isSpacePanning: active } })),
    setVariablePickerOpen: (open) => set((state) => ({ ui: { ...state.ui, variablePickerOpen: open } })),
    setInspectorMessage: (message) => set((state) => ({ ui: { ...state.ui, inspectorMessage: message } })),
    setCanvasSize: (width, height) => set((state) => ({ ui: { ...state.ui, canvasSize: { width, height } } })),
    captureHistory: () => set((state) => ({ history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] } })),
    applyModel: (nextModel, options) => set((state) => ({
        model: cloneCanonicalModel(nextModel),
        history: options?.recordHistory === false ? state.history : { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
        isDirty: options?.dirty ?? true,
    })),
    addElement: (type, position) => {
        if (type === "select" || type === "pan") return null;
        const state = get();
        const result = addElementToModel(state.model, type, position);
        set({
            model: result.model,
            selection: { selectedElementId: result.element.id },
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
            ui: { ...state.ui, activeTool: "select" },
        });
        return result.element.id;
    },
    insertElement: (element) => {
        const state = get();
        const result = insertElementIntoModel(state.model, element);
        set({
            model: result.model,
            selection: { selectedElementId: result.element.id },
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
            ui: { ...state.ui, activeTool: "select" },
        });
        return result.element.id;
    },
    updateElement: (id, updates, options) => set((state) => ({
        model: updateElementInModel(state.model, id, updates),
        history: options?.recordHistory === false ? state.history : { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
        isDirty: true,
    })),
    removeElement: (id) => {
        const state = get();
        if (!state.model.elements.some((element) => element.id === id)) return;
        const nextModel = removeElementFromModel(state.model, id);
        set({
            model: nextModel,
            selection: { selectedElementId: state.selection.selectedElementId === id ? findNextSelectionId(state.model, id) : state.selection.selectedElementId },
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
        });
    },
    duplicateElement: (id) => {
        const state = get();
        const result = duplicateElementInModel(state.model, id);
        if (!result.element) return;
        set({
            model: result.model,
            selection: { selectedElementId: result.element.id },
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
        });
    },
    reorderElement: (id, mode) => {
        const state = get();
        if (!state.model.elements.some((element) => element.id === id)) return;
        set({
            model: reorderElementInModel(state.model, id, mode),
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
        });
    },
    removeSelected: () => {
        const state = get();
        const selectedId = state.selection.selectedElementId;
        if (!selectedId) return;
        const nextModel = removeElementFromModel(state.model, selectedId);
        set({
            model: nextModel,
            selection: { selectedElementId: findNextSelectionId(state.model, selectedId) },
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
        });
    },
    duplicateSelected: () => {
        const state = get();
        const selectedId = state.selection.selectedElementId;
        if (!selectedId) return;
        const result = duplicateElementInModel(state.model, selectedId);
        if (!result.element) return;
        set({
            model: result.model,
            selection: { selectedElementId: result.element.id },
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
        });
    },
    reorderSelected: (mode) => {
        const state = get();
        const selectedId = state.selection.selectedElementId;
        if (!selectedId) return;
        set({
            model: reorderElementInModel(state.model, selectedId, mode),
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
        });
    },
    nudgeSelected: (deltaXmm, deltaYmm) => {
        const state = get();
        const selectedId = state.selection.selectedElementId;
        if (!selectedId) return;
        set({
            model: nudgeElementInModel(state.model, selectedId, deltaXmm, deltaYmm),
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
        });
    },
    rotateSelected: (direction) => {
        const state = get();
        const selectedId = state.selection.selectedElementId;
        if (!selectedId) return;
        const element = state.model.elements.find((item) => item.id === selectedId);
        if (!element) return;
        const current = element.rotation ?? 0;
        const nextRotation = direction === "right"
            ? ((current + 90) % 360)
            : ((current + 270) % 360);
        set({
            model: updateElementInModel(state.model, selectedId, { rotation: nextRotation as 0 | 90 | 180 | 270 }),
            history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
            isDirty: true,
        });
    },
    undo: () => set((state) => {
        if (state.history.past.length === 0) return state;
        const previous = state.history.past[state.history.past.length - 1];
        return {
            model: cloneCanonicalModel(previous),
            history: {
                past: state.history.past.slice(0, -1),
                future: [cloneCanonicalModel(state.model), ...state.history.future].slice(0, 50),
            },
            selection: { selectedElementId: previous.elements.find((element) => element.id === state.selection.selectedElementId)?.id ?? previous.elements[0]?.id ?? null },
            isDirty: true,
        };
    }),
    redo: () => set((state) => {
        if (state.history.future.length === 0) return state;
        const [next, ...future] = state.history.future;
        return {
            model: cloneCanonicalModel(next),
            history: {
                past: [...state.history.past, cloneCanonicalModel(state.model)].slice(-50),
                future,
            },
            selection: { selectedElementId: next.elements.find((element) => element.id === state.selection.selectedElementId)?.id ?? next.elements[0]?.id ?? null },
            isDirty: true,
        };
    }),
    markSaved: () => set({ isDirty: false }),
}));
