import { computeBoundsForElements, getGroupMemberIds, selectionMatchesGroup } from "@/components/Editor/editor-actions";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { useShallow } from "zustand/shallow";

// Optimized selectors that prevent unnecessary re-renders

// Model selectors
export const useEditorModel = () => useEditorStore(useShallow((state) => state.model));

// Selection selectors
export const useEditorSelection = () => useEditorStore(useShallow((state) => state.selection));

export const useSelectedElements = () => useEditorStore(useShallow((state) => {
  const selected = new Set(state.selection.selectedElementIds);
  return state.model.elements.filter((element) => selected.has(element.id));
}));

export const useSelectedElement = () => useEditorStore(useShallow((state) => {
  if (state.selection.selectedElementIds.length !== 1) {
    return null;
  }

  const targetId = state.selection.primarySelectedElementId ?? state.selection.selectedElementIds[0];
  return state.model.elements.find((element) => element.id === targetId) || null;
}));

export const useSelectedGroup = () => useEditorStore(useShallow((state) => {
  const match = selectionMatchesGroup(state.model, state.selection.selectedElementIds);
  if (!match) {
    return null;
  }

  return {
    ...match,
    isEditing: state.selection.activeEditingGroupId === match.groupId,
  };
}));

export const useSelectionBounds = () => useEditorStore(useShallow((state) =>
  computeBoundsForElements(
    state.model.elements.filter((element) => state.selection.selectedElementIds.includes(element.id))
  )
));

export const useSelectionSummary = () => useEditorStore(useShallow((state) => {
  const selected = state.model.elements.filter((element) => state.selection.selectedElementIds.includes(element.id));
  const selectedGroup = selectionMatchesGroup(state.model, state.selection.selectedElementIds);

  return {
    count: selected.length,
    primary: selected.find((element) => element.id === state.selection.primarySelectedElementId) ?? selected[0] ?? null,
    group: selectedGroup,
    activeEditingGroupId: state.selection.activeEditingGroupId ?? null,
  };
}));

// Viewport selectors
export const useEditorViewport = () => useEditorStore(useShallow((state) => state.viewport));

// UI selectors
export const useEditorUI = () => useEditorStore(useShallow((state) => state.ui));

// History selectors
export const useEditorHistory = () => useEditorStore(useShallow((state) => state.history));

// Element selectors
export const useEditorElements = () => useEditorStore(useShallow((state) => state.model.elements));

// Utility selectors
export const useOrderedLayers = () => useEditorStore(useShallow((state) => [...state.model.elements].reverse()));

export const useVisibleElementCount = () => useEditorStore(useShallow((state) => state.model.elements.filter((element) => element.visible !== false).length));

export const useGroupMembers = (groupId: string | null | undefined) => useEditorStore(useShallow((state) => {
  const ids = getGroupMemberIds(state.model, groupId);
  return state.model.elements.filter((element) => ids.includes(element.id));
}));

export const useEditorSelectedIds = () => useEditorStore(useShallow((state) => state.selection.selectedElementIds));

export const useEditorPrimarySelectedId = () => useEditorStore(useShallow((state) => state.selection.primarySelectedElementId));

export const useEditorIsDirty = () => useEditorStore((state) => state.isDirty);

export const useEditorActiveTool = () => useEditorStore((state) => state.ui.activeTool);

export const useEditorClipboard = () => useEditorStore(useShallow((state) => state.clipboard));

export const useEditorRecentColors = () => useEditorStore(useShallow((state) => state.recentColors));
