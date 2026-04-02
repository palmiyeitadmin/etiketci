/**
 * Advanced Guides with Rotation Snapping
 * 
 * Enhanced guide system with:
 * - Rotation snapping (0°, 90°, 180°, 270°)
 * - Spatial index integration for performance
 * - Improved equal spacing detection
 * 
 * @module editor-advanced-guides
 */

import { CanonicalLabelModel, LabelElement, DiscreteRotation } from "@/types/canvas";
import { GuideLine, MeasurementLabel, SnapResult } from "@/components/Editor/editor-guides";
import {
    createSpatialIndex,
    queryNearbyElements,
    queryRegion,
} from "@/components/Editor/editor-spatial-index";
import type { SpatialNode } from "@/components/Editor/editor-spatial-index";

export interface RotationSnapResult {
    rotation: DiscreteRotation;
    snapped: boolean;
    hint?: string;
}

/**
 * Compute rotation snap for element
 * 
 * Snaps to 0°, 90°, 180°, 270° when close
 * 
 * @param element - Element being rotated
 * @param proposedRotation - Proposed rotation angle
 * @param threshold - Threshold in degrees (default: 5°)
 * @returns Snapped rotation or proposed if no snap
 */
export function computeRotationSnap(
    element: LabelElement,
    proposedRotation: number,
    threshold: number = 5
): RotationSnapResult {
    const discreteRotations: DiscreteRotation[] = [0, 90, 180, 270];

    let bestRotation: DiscreteRotation = proposedRotation as DiscreteRotation;
    let snapped = false;
    let hint: string | undefined;

    for (const rotation of discreteRotations) {
        const delta = Math.abs(proposedRotation - rotation);

        if (delta <= threshold) {
            bestRotation = rotation;
            snapped = true;
            hint = `${rotation}° rotation`;
            break;
        }
    }

    return {
        rotation: bestRotation,
        snapped,
        hint,
    };
}

/**
 * Compute enhanced snap with rotation support
 * 
 * @param model - Canvas model
 * @param element - Element being positioned
 * @param proposedXmm - Proposed X position
 * @param proposedYmm - Proposed Y position
 * @param proposedRotation - Proposed rotation (optional)
 * @param thresholdMm - Threshold in mm (default: 2mm)
 * @param rotationThreshold - Rotation threshold in degrees (default: 5°)
 * @returns Snap result with guides, measurements, and rotation snap
 */
export function computeEnhancedSnap({
    model,
    element,
    proposedXmm,
    proposedYmm,
    proposedRotation,
    thresholdMm = 2,
    rotationThreshold = 5,
}: {
    model: CanonicalLabelModel;
    element: LabelElement;
    proposedXmm: number;
    proposedYmm: number;
    proposedRotation?: number;
    thresholdMm?: number;
    rotationThreshold?: number;
}): SnapResult & { rotationSnap?: RotationSnapResult } {
    // Create spatial index for performance
    const index = createSpatialIndex(
        model.elements.filter(el => el.id !== element.id && el.visible !== false),
        model.dimensions.widthMm,
        model.dimensions.heightMm,
        20 // 20mm cell size
    );

    // Query nearby elements using spatial index
    const nearbyElementsX = queryNearbyElements(index, proposedXmm, thresholdMm, true);
    const nearbyElementsY = queryNearbyElements(index, proposedYmm, thresholdMm, false);

    // Collect alignment candidates from nearby elements
    const verticalCandidates = [0, model.dimensions.widthMm / 2, model.dimensions.widthMm];
    const horizontalCandidates = [0, model.dimensions.heightMm / 2, model.dimensions.heightMm];

    for (const node of nearbyElementsX) {
        verticalCandidates.push(
            node.left,
            node.left + node.widthMm / 2,
            node.left + node.widthMm
        );
    }

    for (const node of nearbyElementsY) {
        horizontalCandidates.push(
            node.top,
            node.top + node.heightMm / 2,
            node.top + node.heightMm
        );
    }

    // Compute snap result
    const xResult = snapAxis(proposedXmm, element.widthMm, verticalCandidates, thresholdMm, "vertical");
    const yResult = snapAxis(proposedYmm, element.heightMm, horizontalCandidates, thresholdMm, "horizontal");

    const measurements: MeasurementLabel[] = [];
    const guides = [...xResult.guides, ...yResult.guides];

    // Compute rotation snap if rotation proposed
    let rotationSnap;
    if (proposedRotation !== undefined) {
        rotationSnap = computeRotationSnap(element, proposedRotation, rotationThreshold);
    }

    return {
        xMm: xResult.value,
        yMm: yResult.value,
        guides,
        measurements,
        hint: xResult.hint || yResult.hint || rotationSnap?.hint,
        rotationSnap,
    };
}

/**
 * Snap axis to nearest candidate
 */
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
        measurements: [] as MeasurementLabel[],
    };
}

/**
 * Compute equal spacing using spatial index
 * 
 * O(N log N) instead of O(N²) using spatial queries
 * 
 * @param proposedValue - Proposed X or Y position
 * @param size - Element size
 * @param crossValue - Cross-axis position
 * @param crossSize - Cross-axis size
 * @param index - Spatial index
 * @param orientation - Horizontal or vertical
 * @param thresholdMm - Threshold in mm
 * @returns Snap result or null
 */
export function computeEqualSpacingSnap(
    proposedValue: number,
    size: number,
    crossValue: number,
    crossSize: number,
    index: ReturnType<typeof createSpatialIndex>,
    orientation: "vertical" | "horizontal",
    thresholdMm: number
): { value: number; measurements: MeasurementLabel[] } | null {
    // Query elements overlapping with cross section
    const margin = 10;
    const queryX = orientation === "horizontal" ? proposedValue - margin : 0;
    const queryY = orientation === "horizontal" ? 0 : proposedValue - margin;
    const queryWidth = orientation === "horizontal" ? size + margin * 2 : index.width;
    const queryHeight = orientation === "horizontal" ? index.height : size + margin * 2;

    const nearbyNodes = queryRegion(
        index,
        queryX,
        queryY,
        queryWidth,
        queryHeight
    );

    if (nearbyNodes.length < 2) return null;

    // Group by cross position to find rows/columns
    const crossGroups = new Map<number, SpatialNode[]>();

    for (const node of nearbyNodes) {
        const crossCenter = orientation === "horizontal"
            ? node.top + node.heightMm / 2
            : node.left + node.widthMm / 2;

        const group = crossGroups.get(crossCenter) || [];
        group.push(node);
        crossGroups.set(crossCenter, group);
    }

    // Find groups with equal spacing
    let bestValue = proposedValue;
    let bestDelta = Number.POSITIVE_INFINITY;
    let bestMeasurements: MeasurementLabel[] = [];

    Array.from(crossGroups.entries()).forEach(([crossCenter, group]) => {
        if (group.length < 2) return;

        // Sort by position along axis
        const sorted = group.sort((a: SpatialNode, b: SpatialNode) => {
            return orientation === "horizontal"
                ? a.left - b.left
                : a.top - b.top;
        });

        // Calculate gaps
        const gaps: { gap: number; left: SpatialNode; right: SpatialNode }[] = [];

        for (let i = 0; i < sorted.length - 1; i++) {
            const left = sorted[i];
            const right = sorted[i + 1];
            const gap = orientation === "horizontal"
                ? right.left - (left.left + left.widthMm)
                : right.top - (left.top + left.heightMm);

            if (gap > 0) {
                gaps.push({ gap, left, right });
            }
        }

        // Check for equal spacing
        if (gaps.length < 2) return;

        const avgGap = gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length;
        const isEqualSpacing = gaps.every(g => Math.abs(g.gap - avgGap) < 1);

        if (!isEqualSpacing) return;

        // Try to snap to maintain equal spacing
        const centerIndex = Math.floor(gaps.length / 2);
        const centerGap = gaps[centerIndex];

        const snapPos = orientation === "horizontal"
            ? centerGap.right.left - centerGap.gap / 2
            : centerGap.right.top - centerGap.gap / 2;

        const delta = Math.abs(snapPos - proposedValue);

        if (delta <= thresholdMm && delta < bestDelta) {
            bestDelta = delta;
            bestValue = snapPos;
            bestMeasurements = gaps.map(g => ({
                text: `${g.gap.toFixed(1)} mm`,
                xMm: orientation === "horizontal"
                    ? g.right.left - g.gap / 2
                    : crossCenter,
                yMm: orientation === "horizontal"
                    ? crossCenter
                    : g.right.top - g.gap / 2,
            }));
        }
    });

    if (bestDelta <= thresholdMm) {
        return { value: bestValue, measurements: bestMeasurements };
    }

    return null;
}
