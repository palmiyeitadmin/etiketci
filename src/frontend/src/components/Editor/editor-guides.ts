import { CanonicalLabelModel, LabelElement } from "@/types/canvas";

export interface MeasurementLabel {
  text: string;
  xMm: number;
  yMm: number;
}

export interface GuideLine {
  orientation: "vertical" | "horizontal";
  positionMm: number;
}

export interface SnapResult {
  xMm: number;
  yMm: number;
  guides: GuideLine[];
  measurements?: MeasurementLabel[];
  hint?: string;
}

export interface ResizeSnapResult {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  guides: GuideLine[];
  measurements?: MeasurementLabel[];
}

interface Edge {
  value: number;
  type: "start" | "center" | "end";
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

  const others = model.elements.filter((item) => item.id !== element.id && item.visible !== false);

  others.forEach((item) => {
    verticalCandidates.push(item.xMm, item.xMm + item.widthMm / 2, item.xMm + item.widthMm);
    horizontalCandidates.push(item.yMm, item.yMm + item.heightMm / 2, item.yMm + item.heightMm);
  });

  const xResult = snapAxis(proposedXmm, element.widthMm, verticalCandidates, thresholdMm, "vertical");
  const yResult = snapAxis(proposedYmm, element.heightMm, horizontalCandidates, thresholdMm, "horizontal");

  const measurements: MeasurementLabel[] = [];
  const guides = [...xResult.guides, ...yResult.guides];
  
  // Equal Spacing - Horizontal
  let snappedX = xResult.value;
  if (!xResult.guides.length) {
      const hSnap = detectEqualSpacing(proposedXmm, element.widthMm, element.yMm, element.heightMm, others, "horizontal", thresholdMm);
      if (hSnap) {
          snappedX = hSnap.value;
          measurements.push(...hSnap.measurements);
      }
  }

  // Equal Spacing - Vertical
  let snappedY = yResult.value;
  if (!yResult.guides.length) {
      const vSnap = detectEqualSpacing(proposedYmm, element.heightMm, element.xMm, element.widthMm, others, "vertical", thresholdMm);
      if (vSnap) {
          snappedY = vSnap.value;
          measurements.push(...vSnap.measurements);
      }
  }

  // Generate Margin Labels for regular snaps
  if (xResult.guides.length > 0) {
      // Find nearest neighbor to the left/right to measure against
      const neighborInfo = findNearestNeighbor(snappedX, element.widthMm, element.yMm, element.heightMm, others, "horizontal");
      if (neighborInfo) {
          measurements.push(neighborInfo);
      }
  }
  
  if (yResult.guides.length > 0) {
      // Find nearest neighbor to top/bottom
      const neighborInfo = findNearestNeighbor(snappedY, element.heightMm, element.xMm, element.widthMm, others, "vertical");
      if (neighborInfo) {
          measurements.push(neighborInfo);
      }
  }

  return {
    xMm: snappedX,
    yMm: snappedY,
    guides,
    measurements,
    hint: xResult.hint || yResult.hint,
  };
}

export function computeResizeSnap({
  model,
  element,
  proposedXmm,
  proposedYmm,
  proposedWidthMm,
  proposedHeightMm,
  movingEdges, // e.g. ["left", "top"]
  thresholdMm = 2,
}: {
  model: CanonicalLabelModel;
  element: LabelElement;
  proposedXmm: number;
  proposedYmm: number;
  proposedWidthMm: number;
  proposedHeightMm: number;
  movingEdges: ("left" | "right" | "top" | "bottom")[];
  thresholdMm?: number;
}): ResizeSnapResult {
  const verticalCandidates = [0, model.dimensions.widthMm / 2, model.dimensions.widthMm];
  const horizontalCandidates = [0, model.dimensions.heightMm / 2, model.dimensions.heightMm];

  const others = model.elements.filter((item) => item.id !== element.id && item.visible !== false);

  others.forEach((item) => {
    verticalCandidates.push(item.xMm, item.xMm + item.widthMm / 2, item.xMm + item.widthMm);
    horizontalCandidates.push(item.yMm, item.yMm + item.heightMm / 2, item.yMm + item.heightMm);
  });

  let snappedX = proposedXmm;
  let snappedWidth = proposedWidthMm;
  let snappedY = proposedYmm;
  let snappedHeight = proposedHeightMm;
  let guides: GuideLine[] = [];

  // Left Edge
  if (movingEdges.includes("left")) {
    const res = snapSingleEdge(proposedXmm, verticalCandidates, thresholdMm, "vertical");
    if (res.snapped) {
      const delta = res.value - proposedXmm;
      snappedX = res.value;
      snappedWidth = Math.max(1, proposedWidthMm - delta);
      guides.push(...res.guides);
    }
  }

  // Right Edge
  if (movingEdges.includes("right")) {
    const proposedRight = proposedXmm + proposedWidthMm;
    const res = snapSingleEdge(proposedRight, verticalCandidates, thresholdMm, "vertical");
    if (res.snapped) {
      snappedWidth = Math.max(1, res.value - snappedX);
      guides.push(...res.guides);
    }
  }

  // Top Edge
  if (movingEdges.includes("top")) {
    const res = snapSingleEdge(proposedYmm, horizontalCandidates, thresholdMm, "horizontal");
    if (res.snapped) {
      const delta = res.value - proposedYmm;
      snappedY = res.value;
      snappedHeight = Math.max(1, proposedHeightMm - delta);
      guides.push(...res.guides);
    }
  }

  // Bottom Edge
  if (movingEdges.includes("bottom")) {
    const proposedBottom = proposedYmm + proposedHeightMm;
    const res = snapSingleEdge(proposedBottom, horizontalCandidates, thresholdMm, "horizontal");
    if (res.snapped) {
      snappedHeight = Math.max(1, res.value - snappedY);
      guides.push(...res.guides);
    }
  }

  return {
    xMm: snappedX,
    yMm: snappedY,
    widthMm: snappedWidth,
    heightMm: snappedHeight,
    guides,
  };
}

function snapSingleEdge(
  proposedValue: number,
  candidates: number[],
  threshold: number,
  orientation: "vertical" | "horizontal"
) {
  let bestDelta = Number.POSITIVE_INFINITY;
  let bestValue = proposedValue;
  let bestGuide: GuideLine | null = null;
  let snapped = false;

  for (const candidate of candidates) {
    const delta = Math.abs(proposedValue - candidate);
    if (delta > threshold || delta >= bestDelta) {
        continue;
    }
    bestDelta = delta;
    bestValue = candidate;
    bestGuide = { orientation, positionMm: candidate };
    snapped = true;
  }

  return {
    value: bestValue,
    snapped,
    guides: bestGuide ? [bestGuide] : [],
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
    { current: start, align: (candidate: number) => candidate, hint: orientation === "vertical" ? "Left aligned" : "Top aligned", edge: start },
    { current: start + size / 2, align: (candidate: number) => candidate - size / 2, hint: orientation === "vertical" ? "Center aligned" : "Middle aligned", edge: start + size / 2 },
    { current: start + size, align: (candidate: number) => candidate - size, hint: orientation === "vertical" ? "Right aligned" : "Bottom aligned", edge: start + size },
  ];

  let bestDelta = Number.POSITIVE_INFINITY;
  let bestValue = start;
  let bestGuide: GuideLine | null = null;
  let bestHint: string | undefined;
  let bestEdge: number = start;

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
      bestEdge = position.edge;
    }
  }

  return {
    value: bestValue,
    guides: bestGuide ? [bestGuide] : [] as GuideLine[],
    hint: bestHint,
    measurements: [] as MeasurementLabel[],
  };
}

function detectEqualSpacing(
  proposedValue: number,
  size: number,
  crossValue: number,
  crossSize: number,
  others: LabelElement[],
  orientation: "vertical" | "horizontal",
  threshold: number
) {
  // Find all existing gaps between overlapping items
  const gaps: { gap: number; left: LabelElement; right: LabelElement }[] = [];
  
  for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) {
          const a = others[i];
          const b = others[j];
          
          if (orientation === "horizontal") {
              // check vertical overlap
              if (a.yMm < b.yMm + b.heightMm && a.yMm + a.heightMm > b.yMm) {
                  const left = a.xMm < b.xMm ? a : b;
                  const right = a.xMm < b.xMm ? b : a;
                  const gap = right.xMm - (left.xMm + left.widthMm);
                  if (gap > 2) gaps.push({ gap, left, right });
              }
          } else {
              // check horizontal overlap
              if (a.xMm < b.xMm + b.widthMm && a.xMm + a.widthMm > b.xMm) {
                  const top = a.yMm < b.yMm ? a : b;
                  const bottom = a.yMm < b.yMm ? b : a;
                  const gap = bottom.yMm - (top.yMm + top.heightMm);
                  if (gap > 2) gaps.push({ gap, left: top, right: bottom });
              }
          }
      }
  }

  if (gaps.length === 0) return null;

  let bestValue = proposedValue;
  let bestDelta = Number.POSITIVE_INFINITY;
  let bestMeasurements: MeasurementLabel[] = [];

  for (const { gap, left, right } of gaps) {
      for (const k of others) {
          // Check if K overlaps with our proposed cross section
          const isOverlapping = orientation === "horizontal" 
             ? (k.yMm < crossValue + crossSize && k.yMm + k.heightMm > crossValue)
             : (k.xMm < crossValue + crossSize && k.xMm + k.widthMm > crossValue);
             
          if (!isOverlapping) continue;

          // Our element could be on the right of K
          const pos1 = orientation === "horizontal" ? k.xMm + k.widthMm + gap : k.yMm + k.heightMm + gap;
          if (Math.abs(pos1 - proposedValue) <= threshold && Math.abs(pos1 - proposedValue) < bestDelta) {
              bestDelta = Math.abs(pos1 - proposedValue);
              bestValue = pos1;
              bestMeasurements = [
                  { 
                      text: `${gap.toFixed(1)} mm`, 
                      xMm: orientation === "horizontal" ? k.xMm + k.widthMm + gap / 2 : crossValue + crossSize / 2, 
                      yMm: orientation === "horizontal" ? crossValue + crossSize / 2 : k.yMm + k.heightMm + gap / 2 
                  },
                  {
                      text: `${gap.toFixed(1)} mm`,
                      xMm: orientation === "horizontal" ? left.xMm + left.widthMm + gap / 2 : left.xMm + left.widthMm / 2,
                      yMm: orientation === "horizontal" ? left.yMm + left.heightMm / 2 : left.yMm + left.heightMm + gap / 2
                  }
              ];
          }

          // Our element could be on the left of K
          const pos2 = orientation === "horizontal" ? k.xMm - size - gap : k.yMm - size - gap;
          if (Math.abs(pos2 - proposedValue) <= threshold && Math.abs(pos2 - proposedValue) < bestDelta) {
              bestDelta = Math.abs(pos2 - proposedValue);
              bestValue = pos2;
              bestMeasurements = [
                  { 
                      text: `${gap.toFixed(1)} mm`, 
                      xMm: orientation === "horizontal" ? pos2 + size + gap / 2 : crossValue + crossSize / 2, 
                      yMm: orientation === "horizontal" ? crossValue + crossSize / 2 : pos2 + size + gap / 2 
                  },
                  {
                      text: `${gap.toFixed(1)} mm`,
                      xMm: orientation === "horizontal" ? left.xMm + left.widthMm + gap / 2 : left.xMm + left.widthMm / 2,
                      yMm: orientation === "horizontal" ? left.yMm + left.heightMm / 2 : left.yMm + left.heightMm + gap / 2
                  }
              ];
          }
      }
  }

  if (bestDelta <= threshold) {
      return { value: bestValue, measurements: bestMeasurements };
  }
  
  return null;
}

function findNearestNeighbor(
  value: number,
  size: number,
  crossValue: number,
  crossSize: number,
  others: LabelElement[],
  orientation: "vertical" | "horizontal"
): MeasurementLabel | null {
  let nearestDist = Number.POSITIVE_INFINITY;
  let nearestLabel: MeasurementLabel | null = null;
  
  for (const k of others) {
      const isOverlapping = orientation === "horizontal" 
             ? (k.yMm < crossValue + crossSize && k.yMm + k.heightMm > crossValue)
             : (k.xMm < crossValue + crossSize && k.xMm + k.widthMm > crossValue);
             
      if (!isOverlapping) continue;

      if (orientation === "horizontal") {
          // Gap on left
          if (k.xMm + k.widthMm <= value) {
              const gap = value - (k.xMm + k.widthMm);
              if (gap > 0 && gap < nearestDist) {
                  nearestDist = gap;
                  nearestLabel = { text: `${gap.toFixed(1)} mm`, xMm: k.xMm + k.widthMm + gap / 2, yMm: crossValue + crossSize / 2 };
              }
          }
          // Gap on right
          if (k.xMm >= value + size) {
              const gap = k.xMm - (value + size);
              if (gap > 0 && gap < nearestDist) {
                  nearestDist = gap;
                  nearestLabel = { text: `${gap.toFixed(1)} mm`, xMm: value + size + gap / 2, yMm: crossValue + crossSize / 2 };
              }
          }
      } else {
          // Gap on top
          if (k.yMm + k.heightMm <= value) {
              const gap = value - (k.yMm + k.heightMm);
              if (gap > 0 && gap < nearestDist) {
                  nearestDist = gap;
                  nearestLabel = { text: `${gap.toFixed(1)} mm`, xMm: crossValue + crossSize / 2, yMm: k.yMm + k.heightMm + gap / 2 };
              }
          }
          // Gap on bottom
          if (k.yMm >= value + size) {
              const gap = k.yMm - (value + size);
              if (gap > 0 && gap < nearestDist) {
                  nearestDist = gap;
                  nearestLabel = { text: `${gap.toFixed(1)} mm`, xMm: crossValue + crossSize / 2, yMm: value + size + gap / 2 };
              }
          }
      }
  }
  
  return nearestLabel;
}
