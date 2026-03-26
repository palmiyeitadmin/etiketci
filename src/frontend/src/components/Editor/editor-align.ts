import { updateElementInModel } from "@/components/Editor/editor-actions";
import { CanonicalLabelModel, EditorAlignmentReference, LabelElement, SelectionBounds } from "@/types/canvas";

export type AlignMode =
  | "left"
  | "center-horizontal"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export type DistributeMode = "horizontal" | "vertical";
export type MatchSizeMode = "width" | "height";

function persisted(value: number) {
  return Math.round(value * 100) / 100;
}

function getEligibleSelection(model: CanonicalLabelModel, ids: string[]) {
  const selected = new Set(ids);
  return model.elements.filter((element) => selected.has(element.id) && element.visible !== false && element.locked !== true);
}

export function computeSelectionBounds(elements: LabelElement[]): SelectionBounds | null {
  if (elements.length === 0) return null;

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

function getReferenceBounds(model: CanonicalLabelModel, selection: LabelElement[], reference: EditorAlignmentReference) {
  if (reference === "canvas") {
    return {
      xMm: 0,
      yMm: 0,
      widthMm: model.dimensions.widthMm,
      heightMm: model.dimensions.heightMm,
    };
  }

  return computeSelectionBounds(selection);
}

export function alignSelection(model: CanonicalLabelModel, ids: string[], mode: AlignMode, reference: EditorAlignmentReference) {
  const selection = getEligibleSelection(model, ids);
  if (selection.length === 0) return model;
  const referenceBounds = getReferenceBounds(model, selection, reference);
  if (!referenceBounds) return model;

  let next = model;
  selection.forEach((element) => {
    let xMm = element.xMm;
    let yMm = element.yMm;

    switch (mode) {
      case "left":
        xMm = referenceBounds.xMm;
        break;
      case "center-horizontal":
        xMm = referenceBounds.xMm + (referenceBounds.widthMm - element.widthMm) / 2;
        break;
      case "right":
        xMm = referenceBounds.xMm + referenceBounds.widthMm - element.widthMm;
        break;
      case "top":
        yMm = referenceBounds.yMm;
        break;
      case "middle":
        yMm = referenceBounds.yMm + (referenceBounds.heightMm - element.heightMm) / 2;
        break;
      case "bottom":
        yMm = referenceBounds.yMm + referenceBounds.heightMm - element.heightMm;
        break;
    }

    next = updateElementInModel(next, element.id, { xMm: persisted(xMm), yMm: persisted(yMm) });
  });

  return next;
}

export function distributeSelection(model: CanonicalLabelModel, ids: string[], mode: DistributeMode) {
  const selection = getEligibleSelection(model, ids);
  if (selection.length < 3) return model;

  const ordered = [...selection].sort((a, b) =>
    mode === "horizontal" ? a.xMm - b.xMm : a.yMm - b.yMm
  );

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  let next = model;

  if (mode === "horizontal") {
    const totalWidth = ordered.reduce((sum, element) => sum + element.widthMm, 0);
    const span = (last.xMm + last.widthMm) - first.xMm;
    const gap = (span - totalWidth) / (ordered.length - 1);
    let cursor = first.xMm + first.widthMm + gap;

    ordered.slice(1, -1).forEach((element) => {
      next = updateElementInModel(next, element.id, { xMm: persisted(cursor) });
      cursor += element.widthMm + gap;
    });
    return next;
  }

  const totalHeight = ordered.reduce((sum, element) => sum + element.heightMm, 0);
  const span = (last.yMm + last.heightMm) - first.yMm;
  const gap = (span - totalHeight) / (ordered.length - 1);
  let cursor = first.yMm + first.heightMm + gap;

  ordered.slice(1, -1).forEach((element) => {
    next = updateElementInModel(next, element.id, { yMm: persisted(cursor) });
    cursor += element.heightMm + gap;
  });

  return next;
}

export function matchSelectionSize(model: CanonicalLabelModel, ids: string[], mode: MatchSizeMode, primaryId?: string | null) {
  const selection = getEligibleSelection(model, ids);
  if (selection.length < 2) return model;

  const anchor = selection.find((element) => element.id === primaryId) ?? selection[0];
  let next = model;

  selection.forEach((element) => {
    if (element.id === anchor.id) return;
    next = updateElementInModel(next, element.id, mode === "width"
      ? { widthMm: persisted(anchor.widthMm) }
      : { heightMm: persisted(anchor.heightMm) });
  });

  return next;
}
