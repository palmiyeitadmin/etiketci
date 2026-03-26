import { create } from "zustand";
import { alignSelection, AlignMode, distributeSelection, DistributeMode, matchSelectionSize, MatchSizeMode } from "@/components/Editor/editor-align";
import {
  addElementToModel,
  duplicateElementsInModel,
  findNextSelectionIds,
  getGroupMemberIds,
  groupElementsInModel,
  insertElementIntoModel,
  nudgeElementsInModel,
  removeElementsFromModel,
  reorderElementsInModel,
  reorderGroupInModel,
  ReorderMode,
  rotateElementInModel,
  setGroupLockedInModel,
  setGroupVisibilityInModel,
  sortElementIdsInModelOrder,
  ungroupGroupInModel,
  updateElementInModel,
  updateElementsInModel,
  renameGroupInModel,
} from "@/components/Editor/editor-actions";
import { cloneCanonicalModel, normalizeCanonicalLabelModel } from "@/lib/editor-canonical";
import { EditorAlignmentReference, EditorHistoryState, EditorSelectionState, EditorTool, EditorViewport, CanonicalLabelModel, LabelElement, SelectionBounds } from "@/types/canvas";

interface EditorUiState {
  activeTool: EditorTool;
  isSpacePanning: boolean;
  variablePickerOpen: boolean;
  inspectorMessage?: string | null;
  canvasSize: { width: number; height: number };
}

interface SelectionOptions {
  primaryId?: string | null;
  activeEditingGroupId?: string | null;
  alignmentReference?: EditorAlignmentReference;
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
  setSelection: (ids: string[], options?: SelectionOptions) => void;
  setSelectedElementId: (id: string | null) => void;
  selectOnly: (id: string | string[] | null, options?: SelectionOptions) => void;
  toggleSelectedElement: (id: string, relatedIds?: string[]) => void;
  clearSelection: () => void;
  selectInBounds: (bounds: SelectionBounds, options?: { additive?: boolean }) => void;
  setActiveEditingGroup: (groupId: string | null) => void;
  setAlignmentReference: (reference: EditorAlignmentReference) => void;
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
  updateSelectedElements: (updates: Partial<LabelElement>, options?: { recordHistory?: boolean }) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  reorderElement: (id: string, mode: ReorderMode) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  reorderSelected: (mode: ReorderMode) => void;
  nudgeSelected: (deltaXmm: number, deltaYmm: number) => void;
  rotateSelected: (direction: "left" | "right") => void;
  groupSelected: () => void;
  ungroupSelectedGroup: () => void;
  renameSelectedGroup: (name: string) => void;
  setSelectedGroupVisibility: (visible: boolean) => void;
  setSelectedGroupLocked: (locked: boolean) => void;
  reorderSelectedGroup: (mode: ReorderMode) => void;
  alignSelected: (mode: AlignMode) => void;
  distributeSelected: (mode: DistributeMode) => void;
  matchSelectedSize: (mode: MatchSizeMode) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

const EMPTY_MODEL = normalizeCanonicalLabelModel(undefined, "Untitled Template");

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function createSelectionState(
  ids: string[],
  options?: SelectionOptions,
  current?: EditorSelectionState
): EditorSelectionState {
  const normalizedIds = uniqueIds(ids);
  const primaryCandidate = options?.primaryId ?? current?.primarySelectedElementId ?? null;
  const primarySelectedElementId =
    primaryCandidate && normalizedIds.includes(primaryCandidate)
      ? primaryCandidate
      : normalizedIds[0] ?? null;

  return {
    selectedElementIds: normalizedIds,
    primarySelectedElementId,
    activeEditingGroupId: options?.activeEditingGroupId ?? current?.activeEditingGroupId ?? null,
    alignmentReference: options?.alignmentReference ?? current?.alignmentReference ?? "selection",
  };
}

function getCurrentSelectedGroupId(model: CanonicalLabelModel, selection: EditorSelectionState) {
  const orderedIds = sortElementIdsInModelOrder(model, selection.selectedElementIds);
  if (orderedIds.length < 2) return null;
  const first = model.elements.find((element) => element.id === orderedIds[0]);
  if (!first?.groupId) return null;
  const members = getGroupMemberIds(model, first.groupId);
  if (members.length !== orderedIds.length) return null;
  return members.every((id, index) => id === orderedIds[index]) ? first.groupId : null;
}

function elementIntersectsBounds(element: LabelElement, bounds: SelectionBounds) {
  const right = element.xMm + element.widthMm;
  const bottom = element.yMm + element.heightMm;
  const boundsRight = bounds.xMm + bounds.widthMm;
  const boundsBottom = bounds.yMm + bounds.heightMm;

  return !(right < bounds.xMm || bottom < bounds.yMm || element.xMm > boundsRight || element.yMm > boundsBottom);
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  model: EMPTY_MODEL,
  selection: createSelectionState([]),
  history: { past: [], future: [] },
  viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
  ui: { activeTool: "select", isSpacePanning: false, variablePickerOpen: false, inspectorMessage: null, canvasSize: { width: 1200, height: 800 } },
  isDirty: false,
  initialized: false,
  initialize: (model) => {
    const normalized = normalizeCanonicalLabelModel(model, model.name || "Untitled Template");
    set({
      model: normalized,
      selection: createSelectionState([]),
      history: { past: [], future: [] },
      viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
      ui: { activeTool: "select", isSpacePanning: false, variablePickerOpen: false, inspectorMessage: null, canvasSize: { width: 1200, height: 800 } },
      isDirty: false,
      initialized: true,
    });
  },
  setTool: (tool) => set((state) => ({ ui: { ...state.ui, activeTool: tool } })),
  setSelection: (ids, options) => set((state) => ({ selection: createSelectionState(ids, options, state.selection) })),
  setSelectedElementId: (id) => set((state) => ({ selection: createSelectionState(id ? [id] : [], { primaryId: id }, state.selection) })),
  selectOnly: (id, options) => set((state) => {
    const ids = Array.isArray(id) ? id : id ? [id] : [];
    return { selection: createSelectionState(ids, options, state.selection) };
  }),
  toggleSelectedElement: (id, relatedIds) => set((state) => {
    const ids = uniqueIds(relatedIds?.length ? relatedIds : [id]);
    const current = new Set(state.selection.selectedElementIds);
    const allSelected = ids.every((candidate) => current.has(candidate));

    if (allSelected) {
      ids.forEach((candidate) => current.delete(candidate));
    } else {
      ids.forEach((candidate) => current.add(candidate));
    }

    const nextIds = Array.from(current);
    return {
      selection: createSelectionState(nextIds, { primaryId: allSelected ? state.selection.primarySelectedElementId : id }, state.selection),
    };
  }),
  clearSelection: () => set((state) => ({ selection: createSelectionState([], { activeEditingGroupId: null }, state.selection) })),
  selectInBounds: (bounds, options) => set((state) => {
    const selectionPool = state.model.elements.filter((element) =>
      element.visible !== false &&
      element.locked !== true &&
      (!state.selection.activeEditingGroupId || element.groupId === state.selection.activeEditingGroupId) &&
      elementIntersectsBounds(element, bounds)
    );

    let ids = selectionPool.map((element) => element.id);
    if (!state.selection.activeEditingGroupId) {
      const groupIds = uniqueIds(selectionPool.map((element) => element.groupId || ""));
      groupIds.forEach((groupId) => {
        ids = ids.concat(getGroupMemberIds(state.model, groupId));
      });
    }

    const nextIds = options?.additive
      ? uniqueIds([...state.selection.selectedElementIds, ...ids])
      : uniqueIds(ids);

    return {
      selection: createSelectionState(nextIds, {}, state.selection),
    };
  }),
  setActiveEditingGroup: (groupId) => set((state) => ({
    selection: createSelectionState(
      groupId ? getGroupMemberIds(state.model, groupId) : state.selection.selectedElementIds,
      { activeEditingGroupId: groupId, primaryId: groupId ? getGroupMemberIds(state.model, groupId)[0] ?? null : state.selection.primarySelectedElementId },
      state.selection
    ),
  })),
  setAlignmentReference: (reference) => set((state) => ({
    selection: createSelectionState(state.selection.selectedElementIds, { alignmentReference: reference }, state.selection),
  })),
  setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
  setSpacePanning: (active) => set((state) => ({ ui: { ...state.ui, isSpacePanning: active } })),
  setVariablePickerOpen: (open) => set((state) => ({ ui: { ...state.ui, variablePickerOpen: open } })),
  setInspectorMessage: (message) => set((state) => ({ ui: { ...state.ui, inspectorMessage: message } })),
  setCanvasSize: (width, height) => set((state) => ({ ui: { ...state.ui, canvasSize: { width, height } } })),
  captureHistory: () => set((state) => ({ history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] } })),
  applyModel: (nextModel, options) => set((state) => {
    const normalizedSelectionIds = state.selection.selectedElementIds.filter((id) => nextModel.elements.some((element) => element.id === id));
    const activeEditingGroupId = state.selection.activeEditingGroupId && nextModel.elements.some((element) => element.groupId === state.selection.activeEditingGroupId)
      ? state.selection.activeEditingGroupId
      : null;

    return {
      model: cloneCanonicalModel(nextModel),
      history: options?.recordHistory === false ? state.history : { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      selection: createSelectionState(normalizedSelectionIds, { activeEditingGroupId }, state.selection),
      isDirty: options?.dirty ?? true,
    };
  }),
  addElement: (type, position) => {
    if (type === "select" || type === "pan") return null;
    const state = get();
    const result = addElementToModel(state.model, type, position);
    set({
      model: result.model,
      selection: createSelectionState([result.element.id], { primaryId: result.element.id, activeEditingGroupId: null }, state.selection),
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
      selection: createSelectionState([result.element.id], { primaryId: result.element.id, activeEditingGroupId: null }, state.selection),
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
  updateSelectedElements: (updates, options) => set((state) => ({
    model: updateElementsInModel(state.model, state.selection.selectedElementIds, updates),
    history: options?.recordHistory === false ? state.history : { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
    isDirty: true,
  })),
  removeElement: (id) => {
    const state = get();
    if (!state.model.elements.some((element) => element.id === id)) return;
    const nextModel = removeElementsFromModel(state.model, [id]);
    set({
      model: nextModel,
      selection: createSelectionState(findNextSelectionIds(state.model, [id]), { activeEditingGroupId: null }, state.selection),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  duplicateElement: (id) => {
    const state = get();
    const result = duplicateElementsInModel(state.model, [id]);
    if (result.elements.length === 0) return;
    set({
      model: result.model,
      selection: createSelectionState(result.elements.map((element) => element.id), { primaryId: result.elements[0].id, activeEditingGroupId: null }, state.selection),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  reorderElement: (id, mode) => {
    const state = get();
    if (!state.model.elements.some((element) => element.id === id)) return;
    set({
      model: reorderElementsInModel(state.model, [id], mode),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  removeSelected: () => {
    const state = get();
    if (state.selection.selectedElementIds.length === 0) return;
    const nextModel = removeElementsFromModel(state.model, state.selection.selectedElementIds);
    set({
      model: nextModel,
      selection: createSelectionState(findNextSelectionIds(state.model, state.selection.selectedElementIds), { activeEditingGroupId: null }, state.selection),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  duplicateSelected: () => {
    const state = get();
    if (state.selection.selectedElementIds.length === 0) return;
    const result = duplicateElementsInModel(state.model, state.selection.selectedElementIds);
    if (result.elements.length === 0) return;
    set({
      model: result.model,
      selection: createSelectionState(result.elements.map((element) => element.id), { primaryId: result.elements[0].id, activeEditingGroupId: null }, state.selection),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  reorderSelected: (mode) => {
    const state = get();
    if (state.selection.selectedElementIds.length === 0) return;
    set({
      model: reorderElementsInModel(state.model, state.selection.selectedElementIds, mode),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  nudgeSelected: (deltaXmm, deltaYmm) => {
    const state = get();
    if (state.selection.selectedElementIds.length === 0) return;
    set({
      model: nudgeElementsInModel(state.model, state.selection.selectedElementIds, deltaXmm, deltaYmm),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  rotateSelected: (direction) => {
    const state = get();
    if (state.selection.selectedElementIds.length !== 1) return;
    const selectedId = state.selection.primarySelectedElementId ?? state.selection.selectedElementIds[0];
    if (!selectedId) return;
    set({
      model: rotateElementInModel(state.model, selectedId, direction),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  groupSelected: () => {
    const state = get();
    if (state.selection.selectedElementIds.length < 2) return;
    const result = groupElementsInModel(state.model, state.selection.selectedElementIds);
    if (!result.groupId) return;
    const groupedIds = getGroupMemberIds(result.model, result.groupId);
    set({
      model: result.model,
      selection: createSelectionState(groupedIds, { primaryId: groupedIds[0] ?? null, activeEditingGroupId: null }, state.selection),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  ungroupSelectedGroup: () => {
    const state = get();
    const groupId = getCurrentSelectedGroupId(state.model, state.selection);
    if (!groupId) return;
    const memberIds = getGroupMemberIds(state.model, groupId);
    set({
      model: ungroupGroupInModel(state.model, groupId),
      selection: createSelectionState(memberIds, { primaryId: memberIds[0] ?? null, activeEditingGroupId: null }, state.selection),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  renameSelectedGroup: (name) => {
    const state = get();
    const groupId = getCurrentSelectedGroupId(state.model, state.selection);
    if (!groupId) return;
    set({
      model: renameGroupInModel(state.model, groupId, name),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  setSelectedGroupVisibility: (visible) => {
    const state = get();
    const groupId = getCurrentSelectedGroupId(state.model, state.selection);
    if (!groupId) return;
    set({
      model: setGroupVisibilityInModel(state.model, groupId, visible),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  setSelectedGroupLocked: (locked) => {
    const state = get();
    const groupId = getCurrentSelectedGroupId(state.model, state.selection);
    if (!groupId) return;
    set({
      model: setGroupLockedInModel(state.model, groupId, locked),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  reorderSelectedGroup: (mode) => {
    const state = get();
    const groupId = getCurrentSelectedGroupId(state.model, state.selection);
    if (!groupId) return;
    set({
      model: reorderGroupInModel(state.model, groupId, mode),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  alignSelected: (mode) => {
    const state = get();
    if (state.selection.selectedElementIds.length === 0) return;
    set({
      model: alignSelection(state.model, state.selection.selectedElementIds, mode, state.selection.alignmentReference),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  distributeSelected: (mode) => {
    const state = get();
    if (state.selection.selectedElementIds.length < 3) return;
    set({
      model: distributeSelection(state.model, state.selection.selectedElementIds, mode),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  matchSelectedSize: (mode) => {
    const state = get();
    if (state.selection.selectedElementIds.length < 2) return;
    set({
      model: matchSelectionSize(state.model, state.selection.selectedElementIds, mode, state.selection.primarySelectedElementId),
      history: { past: [...state.history.past.slice(-49), cloneCanonicalModel(state.model)], future: [] },
      isDirty: true,
    });
  },
  undo: () => set((state) => {
    if (state.history.past.length === 0) return state;
    const previous = state.history.past[state.history.past.length - 1];
    const retainedIds = state.selection.selectedElementIds.filter((id) => previous.elements.some((element) => element.id === id));
    return {
      model: cloneCanonicalModel(previous),
      history: {
        past: state.history.past.slice(0, -1),
        future: [cloneCanonicalModel(state.model), ...state.history.future].slice(0, 50),
      },
      selection: createSelectionState(retainedIds, {
        primaryId: retainedIds.includes(state.selection.primarySelectedElementId || "") ? state.selection.primarySelectedElementId : retainedIds[0] ?? null,
        activeEditingGroupId: state.selection.activeEditingGroupId && previous.elements.some((element) => element.groupId === state.selection.activeEditingGroupId)
          ? state.selection.activeEditingGroupId
          : null,
      }, state.selection),
      isDirty: true,
    };
  }),
  redo: () => set((state) => {
    if (state.history.future.length === 0) return state;
    const [next, ...future] = state.history.future;
    const retainedIds = state.selection.selectedElementIds.filter((id) => next.elements.some((element) => element.id === id));
    return {
      model: cloneCanonicalModel(next),
      history: {
        past: [...state.history.past, cloneCanonicalModel(state.model)].slice(-50),
        future,
      },
      selection: createSelectionState(retainedIds, {
        primaryId: retainedIds.includes(state.selection.primarySelectedElementId || "") ? state.selection.primarySelectedElementId : retainedIds[0] ?? null,
        activeEditingGroupId: state.selection.activeEditingGroupId && next.elements.some((element) => element.groupId === state.selection.activeEditingGroupId)
          ? state.selection.activeEditingGroupId
          : null,
      }, state.selection),
      isDirty: true,
    };
  }),
  markSaved: () => set({ isDirty: false }),
}));
