import { CanonicalLabelModel, LabelElement } from "@/types/canvas";

export interface GuideLine {
  orientation: "vertical" | "horizontal";
  positionMm: number;
}

export interface SnapResult {
  xMm: number;
  yMm: number;
  guides: GuideLine[];
  hint?: string;
}

export function computeElementSnap({
  model,
  element,
  proposedXmm,
  proposedYmm,
  thresholdMm = 2,
}: {
  model: CanonicalLabelModel;
  element: LabelElement;
  proposedXmm: number;
  proposedYmm: number;
  thresholdMm?: number;
}): SnapResult {
  const verticalCandidates = [0, model.dimensions.widthMm / 2, model.dimensions.widthMm];
  const horizontalCandidates = [0, model.dimensions.heightMm / 2, model.dimensions.heightMm];

  model.elements
    .filter((item) => item.id !== element.id && item.visible !== false)
    .forEach((item) => {
      verticalCandidates.push(item.xMm, item.xMm + item.widthMm / 2, item.xMm + item.widthMm);
      horizontalCandidates.push(item.yMm, item.yMm + item.heightMm / 2, item.yMm + item.heightMm);
    });

  const xResult = snapAxis(proposedXmm, element.widthMm, verticalCandidates, thresholdMm, "vertical");
  const yResult = snapAxis(proposedYmm, element.heightMm, horizontalCandidates, thresholdMm, "horizontal");

  return {
    xMm: xResult.value,
    yMm: yResult.value,
    guides: [...xResult.guides, ...yResult.guides],
    hint: xResult.hint || yResult.hint,
  };
}

function snapAxis(
  start: number,
  size: number,
  candidates: number[],
  threshold: number,
  orientation: "vertical" | "horizontal"
) {
  const positions = [
    { current: start, align: (candidate: number) => candidate, hint: orientation === "vertical" ? "Snapped to left edge" : "Snapped to top edge" },
    { current: start + size / 2, align: (candidate: number) => candidate - size / 2, hint: orientation === "vertical" ? "Aligned center" : "Aligned middle" },
    { current: start + size, align: (candidate: number) => candidate - size, hint: orientation === "vertical" ? "Snapped to right edge" : "Snapped to bottom edge" },
  ];

  let bestDelta = Number.POSITIVE_INFINITY;
  let bestValue = start;
  let bestGuide: GuideLine | null = null;
  let bestHint: string | undefined;

  for (const candidate of candidates) {
    for (const position of positions) {
      const delta = Math.abs(position.current - candidate);
      if (delta > threshold || delta >= bestDelta) {
        continue;
      }

      bestDelta = delta;
      bestValue = position.align(candidate);
      bestGuide = { orientation, positionMm: candidate };
      bestHint = position.hint;
    }
  }

  return {
    value: bestValue,
    guides: bestGuide ? [bestGuide] : [] as GuideLine[],
    hint: bestHint,
  };
}
