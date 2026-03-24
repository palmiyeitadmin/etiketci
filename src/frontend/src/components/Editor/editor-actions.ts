import { cloneCanonicalModel, createDefaultElement, nextElementName } from "@/lib/editor-canonical";
import { CanonicalLabelModel, EditorViewport, ElementType, LabelElement } from "@/types/canvas";

export function addElementToModel(model: CanonicalLabelModel, type: ElementType, position?: { xMm: number; yMm: number }): { model: CanonicalLabelModel; element: LabelElement } {
    const next = cloneCanonicalModel(model);
    const element = createDefaultElement(type, next.elements.filter((item) => item.type === type).length + 1, position);
    element.name = nextElementName(next, type);
    next.elements.push(element);
    return { model: next, element };
}

export function insertElementIntoModel(model: CanonicalLabelModel, element: LabelElement): { model: CanonicalLabelModel; element: LabelElement } {
    const next = cloneCanonicalModel(model);
    next.elements.push(cloneCanonicalModel(element));
    return { model: next, element };
}

export function updateElementInModel(model: CanonicalLabelModel, id: string, updates: Partial<LabelElement>): CanonicalLabelModel {
    const next = cloneCanonicalModel(model);
    next.elements = next.elements.map((element) => element.id === id ? { ...element, ...updates } as LabelElement : element);
    return next;
}

export function removeElementFromModel(model: CanonicalLabelModel, id: string): CanonicalLabelModel {
    const next = cloneCanonicalModel(model);
    next.elements = next.elements.filter((element) => element.id !== id);
    return next;
}

export function duplicateElementInModel(model: CanonicalLabelModel, id: string): { model: CanonicalLabelModel; element: LabelElement | null } {
    const next = cloneCanonicalModel(model);
    const index = next.elements.findIndex((element) => element.id === id);
    if (index === -1) {
        return { model: next, element: null };
    }

    const source = next.elements[index];
    const duplicate = cloneCanonicalModel(source);
    duplicate.id = `${source.id}-copy-${Math.random().toString(36).slice(2, 6)}`;
    duplicate.xMm += 3;
    duplicate.yMm += 3;
    duplicate.name = `${source.name || source.type} Copy`;
    next.elements.splice(index + 1, 0, duplicate);
    return { model: next, element: duplicate };
}

export function findNextSelectionId(model: CanonicalLabelModel, removedId: string): string | null {
    const removedIndex = model.elements.findIndex((element) => element.id === removedId);
    if (removedIndex === -1) {
        return model.elements.at(-1)?.id ?? null;
    }

    const nextIndex = Math.min(removedIndex, Math.max(0, model.elements.length - 2));
    const remaining = model.elements.filter((element) => element.id !== removedId);
    return remaining[nextIndex]?.id ?? remaining.at(-1)?.id ?? null;
}

export function reorderElementInModel(model: CanonicalLabelModel, id: string, mode: "forward" | "backward" | "front" | "back"): CanonicalLabelModel {
    const next = cloneCanonicalModel(model);
    const index = next.elements.findIndex((element) => element.id === id);
    if (index === -1) return next;

    const [element] = next.elements.splice(index, 1);
    let targetIndex = index;

    switch (mode) {
        case "forward":
            targetIndex = Math.min(next.elements.length, index + 1);
            break;
        case "backward":
            targetIndex = Math.max(0, index - 1);
            break;
        case "front":
            targetIndex = next.elements.length;
            break;
        case "back":
            targetIndex = 0;
            break;
    }

    next.elements.splice(targetIndex, 0, element);
    return next;
}

export function nudgeElementInModel(model: CanonicalLabelModel, id: string, deltaXmm: number, deltaYmm: number): CanonicalLabelModel {
    const element = model.elements.find((item) => item.id === id);
    return updateElementInModel(model, id, {
        xMm: Math.round((((element?.xMm) ?? 0) + deltaXmm) * 100) / 100,
        yMm: Math.round((((element?.yMm) ?? 0) + deltaYmm) * 100) / 100,
    });
}

export function renameModel(model: CanonicalLabelModel, name: string): CanonicalLabelModel {
    const next = cloneCanonicalModel(model);
    next.name = name;
    return next;
}

export function resizeModelCanvas(model: CanonicalLabelModel, dimensions: { widthMm: number; heightMm: number }): CanonicalLabelModel {
    const next = cloneCanonicalModel(model);
    next.dimensions.widthMm = Math.round(dimensions.widthMm * 100) / 100;
    next.dimensions.heightMm = Math.round(dimensions.heightMm * 100) / 100;
    return next;
}

export function fitViewportToContainer(labelWidthPx: number, labelHeightPx: number, containerWidth: number, containerHeight: number, padding = 48): EditorViewport {
    const availableWidth = Math.max(100, containerWidth - padding * 2);
    const availableHeight = Math.max(100, containerHeight - padding * 2);
    const zoom = Math.max(0.2, Math.min(4, Math.min(availableWidth / labelWidthPx, availableHeight / labelHeightPx)));

    return {
        zoom,
        offsetX: 0,
        offsetY: 0,
    };
}
