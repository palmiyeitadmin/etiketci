import { useEditorStore } from "@/components/Editor/useEditorStore";
import { useShallow } from "zustand/shallow";

export const useSelectedElement = () => useEditorStore(useShallow((state) =>
    state.model.elements.find((element) => element.id === state.selection.selectedElementId) || null
));

export const useOrderedLayers = () => useEditorStore(useShallow((state) => [...state.model.elements].reverse()));

export const useVisibleElementCount = () => useEditorStore(useShallow((state) => state.model.elements.filter((element) => element.visible !== false).length));
