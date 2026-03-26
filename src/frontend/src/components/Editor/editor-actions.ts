import { cloneCanonicalModel, createDefaultElement, nextElementName } from "@/lib/editor-canonical";
import { CanonicalLabelModel, EditorViewport, ElementType, LabelElement, SelectionBounds } from "@/types/canvas";

export type ReorderMode = "forward" | "backward" | "front" | "back";

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function makeGroupId() {
  return `grp-${Math.random().toString(36).slice(2, 8)}`;
}

function makeCopyId(sourceId: string) {
  return `${sourceId}-copy-${Math.random().toString(36).slice(2, 6)}`;
}

export function sortElementIdsInModelOrder(model: CanonicalLabelModel, ids: string[]) {
  const selected = new Set(uniqueIds(ids));
  return model.elements.filter((element) => selected.has(element.id)).map((element) => element.id);
}

export function getElementsByIds(model: CanonicalLabelModel, ids: string[]) {
  const selected = new Set(uniqueIds(ids));
  return model.elements.filter((element) => selected.has(element.id));
}

export function getGroupMemberIds(model: CanonicalLabelModel, groupId: string | null | undefined) {
  if (!groupId) return [];
  return model.elements.filter((element) => element.groupId === groupId).map((element) => element.id);
}

export function getGroupMemberElements(model: CanonicalLabelModel, groupId: string | null | undefined) {
  if (!groupId) return [];
  return model.elements.filter((element) => element.groupId === groupId);
}

export function selectionMatchesGroup(model: CanonicalLabelModel, ids: string[]) {
  const orderedIds = sortElementIdsInModelOrder(model, ids);
  if (orderedIds.length < 2) {
    return null;
  }

  const elements = getElementsByIds(model, orderedIds);
  const groupId = elements[0]?.groupId;
  if (!groupId || !elements.every((element) => element.groupId === groupId)) {
    return null;
  }

  const groupMembers = getGroupMemberIds(model, groupId);
  if (groupMembers.length !== orderedIds.length) {
    return null;
  }

  return groupMembers.every((id, index) => id === orderedIds[index])
    ? { groupId, groupName: elements[0]?.groupName || groupId, elementIds: groupMembers }
    : null;
}

export function computeBoundsForElements(elements: LabelElement[]): SelectionBounds | null {
  if (elements.length === 0) {
    return null;
  }

  const minX = Math.min(...elements.map((element) => element.xMm));
  const minY = Math.min(...elements.map((element) => element.yMm));
  const maxX = Math.max(...elements.map((element) => element.xMm + element.widthMm));
  const maxY = Math.max(...elements.map((element) => element.yMm + element.heightMm));

  return {
    xMm: minX,
    yMm: minY,
    widthMm: maxX - minX,
    heightMm: maxY - minY,
  };
}

export function computeSelectionBounds(model: CanonicalLabelModel, ids: string[]) {
  return computeBoundsForElements(getElementsByIds(model, ids));
}

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

export function updateElementsInModel(model: CanonicalLabelModel, ids: string[], updates: Partial<LabelElement>): CanonicalLabelModel {
  const selected = new Set(uniqueIds(ids));
  const next = cloneCanonicalModel(model);
  next.elements = next.elements.map((element) => selected.has(element.id) ? { ...element, ...updates } as LabelElement : element);
  return next;
}

export function removeElementFromModel(model: CanonicalLabelModel, id: string): CanonicalLabelModel {
  return removeElementsFromModel(model, [id]);
}

export function removeElementsFromModel(model: CanonicalLabelModel, ids: string[]): CanonicalLabelModel {
  const selected = new Set(uniqueIds(ids));
  const next = cloneCanonicalModel(model);
  next.elements = next.elements.filter((element) => !selected.has(element.id));
  return next;
}

export function duplicateElementInModel(model: CanonicalLabelModel, id: string): { model: CanonicalLabelModel; element: LabelElement | null } {
  const result = duplicateElementsInModel(model, [id]);
  return { model: result.model, element: result.elements[0] ?? null };
}

export function duplicateElementsInModel(model: CanonicalLabelModel, ids: string[]) {
  const orderedIds = sortElementIdsInModelOrder(model, ids);
  if (orderedIds.length === 0) {
    return { model: cloneCanonicalModel(model), elements: [] as LabelElement[] };
  }

  const next = cloneCanonicalModel(model);
  const selectedSet = new Set(orderedIds);
  const selectedElements = next.elements.filter((element) => selectedSet.has(element.id));
  const lastSelectedIndex = Math.max(...orderedIds.map((id) => next.elements.findIndex((element) => element.id === id)));
  const duplicateGroupIds = new Map<string, string>();
  const duplicates = selectedElements.map((source) => {
    const duplicate = cloneCanonicalModel(source);
    duplicate.id = makeCopyId(source.id);
    duplicate.xMm = Math.round((duplicate.xMm + 3) * 100) / 100;
    duplicate.yMm = Math.round((duplicate.yMm + 3) * 100) / 100;
    duplicate.name = `${source.name || source.type} Copy`;

    if (source.groupId) {
      if (!duplicateGroupIds.has(source.groupId)) {
        duplicateGroupIds.set(source.groupId, makeGroupId());
      }
      duplicate.groupId = duplicateGroupIds.get(source.groupId);
      duplicate.groupName = source.groupName || source.groupId;
    }

    return duplicate;
  });

  next.elements.splice(lastSelectedIndex + 1, 0, ...duplicates);
  return { model: next, elements: duplicates };
}

export function findNextSelectionIds(model: CanonicalLabelModel, removedIds: string[]): string[] {
  const selected = new Set(uniqueIds(removedIds));
  const remaining = model.elements.filter((element) => !selected.has(element.id));
  return remaining[0] ? [remaining[0].id] : [];
}

function reinsertBlock(next: CanonicalLabelModel, ids: string[], insertAt: number) {
  const orderedIds = sortElementIdsInModelOrder(next, ids);
  const selectedSet = new Set(orderedIds);
  const block = next.elements.filter((element) => selectedSet.has(element.id));
  const remaining = next.elements.filter((element) => !selectedSet.has(element.id));
  remaining.splice(insertAt, 0, ...block);
  next.elements = remaining;
  return next;
}

export function reorderElementInModel(model: CanonicalLabelModel, id: string, mode: ReorderMode): CanonicalLabelModel {
  return reorderElementsInModel(model, [id], mode);
}

export function reorderElementsInModel(model: CanonicalLabelModel, ids: string[], mode: ReorderMode): CanonicalLabelModel {
  const orderedIds = sortElementIdsInModelOrder(model, ids);
  if (orderedIds.length === 0) return cloneCanonicalModel(model);

  const indices = orderedIds.map((id) => model.elements.findIndex((element) => element.id === id)).filter((index) => index >= 0);
  if (indices.length === 0) return cloneCanonicalModel(model);

  const firstIndex = Math.min(...indices);
  const lastIndex = Math.max(...indices);
  const remainingLength = model.elements.length - orderedIds.length;
  let insertAt = firstIndex;

  switch (mode) {
    case "forward":
      insertAt = Math.min(remainingLength, firstIndex + 1);
      break;
    case "backward":
      insertAt = Math.max(0, firstIndex - 1);
      break;
    case "front":
      insertAt = remainingLength;
      break;
    case "back":
      insertAt = 0;
      break;
  }

  const next = cloneCanonicalModel(model);
  if (mode === "forward" && lastIndex === model.elements.length - 1) return next;
  if (mode === "backward" && firstIndex === 0) return next;
  return reinsertBlock(next, orderedIds, insertAt);
}

export function nudgeElementInModel(model: CanonicalLabelModel, id: string, deltaXmm: number, deltaYmm: number): CanonicalLabelModel {
  return nudgeElementsInModel(model, [id], deltaXmm, deltaYmm);
}

export function nudgeElementsInModel(model: CanonicalLabelModel, ids: string[], deltaXmm: number, deltaYmm: number): CanonicalLabelModel {
  const selected = new Set(uniqueIds(ids));
  const next = cloneCanonicalModel(model);
  next.elements = next.elements.map((element) => {
    if (!selected.has(element.id)) return element;
    return {
      ...element,
      xMm: Math.round((element.xMm + deltaXmm) * 100) / 100,
      yMm: Math.round((element.yMm + deltaYmm) * 100) / 100,
    };
  });
  return next;
}

export function rotateElementInModel(model: CanonicalLabelModel, id: string, direction: "left" | "right"): CanonicalLabelModel {
  const element = model.elements.find((item) => item.id === id);
  if (!element) return cloneCanonicalModel(model);
  const current = element.rotation ?? 0;
  const nextRotation = direction === "right" ? ((current + 90) % 360) : ((current + 270) % 360);
  return updateElementInModel(model, id, { rotation: nextRotation as 0 | 90 | 180 | 270 });
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

export function groupElementsInModel(model: CanonicalLabelModel, ids: string[], groupName?: string) {
  const orderedIds = sortElementIdsInModelOrder(model, ids);
  if (orderedIds.length < 2) {
    return { model: cloneCanonicalModel(model), groupId: null as string | null };
  }

  const next = cloneCanonicalModel(model);
  const groupId = makeGroupId();
  const firstElement = next.elements.find((element) => element.id === orderedIds[0]);
  const resolvedName = groupName?.trim() || firstElement?.groupName || firstElement?.name || "Group";
  next.elements = next.elements.map((element) => orderedIds.includes(element.id)
    ? { ...element, groupId, groupName: resolvedName }
    : element);

  const firstIndex = Math.min(...orderedIds.map((id) => model.elements.findIndex((element) => element.id === id)));
  reinsertBlock(next, orderedIds, firstIndex);
  return { model: next, groupId };
}

export function ungroupGroupInModel(model: CanonicalLabelModel, groupId: string) {
  const next = cloneCanonicalModel(model);
  next.elements = next.elements.map((element) => element.groupId === groupId
    ? { ...element, groupId: undefined, groupName: undefined }
    : element);
  return next;
}

export function renameGroupInModel(model: CanonicalLabelModel, groupId: string, name: string) {
  const nextName = name.trim();
  return updateElementsInModel(model, getGroupMemberIds(model, groupId), { groupName: nextName || groupId });
}

export function setGroupVisibilityInModel(model: CanonicalLabelModel, groupId: string, visible: boolean) {
  return updateElementsInModel(model, getGroupMemberIds(model, groupId), { visible });
}

export function setGroupLockedInModel(model: CanonicalLabelModel, groupId: string, locked: boolean) {
  return updateElementsInModel(model, getGroupMemberIds(model, groupId), { locked });
}

export function reorderGroupInModel(model: CanonicalLabelModel, groupId: string, mode: ReorderMode) {
  return reorderElementsInModel(model, getGroupMemberIds(model, groupId), mode);
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
