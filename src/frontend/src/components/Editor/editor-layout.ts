/**
 * Auto Layout / Flexbox Engine
 * 
 * Implements flexbox-like layout system for label editor containers.
 * Supports: direction, justify-content, align-items, gap, wrap
 * 
 * Layout Computation:
 * 1. Calculate available space in container
 * 2. Measure all children (fixed sizes or auto)
 * 3. Apply flex direction and wrap
 * 4. Apply justify-content (horizontal distribution)
 * 5. Apply align-items (vertical distribution)
 * 6. Return positioned children
 * 
 * @module editor-layout
 */

import type {
    ContainerElement,
    LabelElement,
    LayoutDirection,
    LayoutJustifyContent,
    LayoutAlignItems,
    LayoutGap,
    LayoutWrap,
} from "@/types/canvas";

interface LayoutConfig {
    direction: LayoutDirection;
    justifyContent: LayoutJustifyContent;
    alignItems: LayoutAlignItems;
    gap: LayoutGap;
    wrap: LayoutWrap;
}

interface PositionedChild {
    element: LabelElement;
    xMm: number;
    yMm: number;
}

interface LayoutResult {
    children: PositionedChild[];
    containerWidthMm: number;
    containerHeightMm: number;
}

/**
 * Default layout configuration
 */
const DEFAULT_LAYOUT: LayoutConfig = {
    direction: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: 2, // 2mm default gap
    wrap: "nowrap",
};

/**
 * Get layout configuration from container element
 */
function getLayoutConfig(container: ContainerElement): LayoutConfig {
    return {
        direction: container.direction ?? DEFAULT_LAYOUT.direction,
        justifyContent: container.justifyContent ?? DEFAULT_LAYOUT.justifyContent,
        alignItems: container.alignItems ?? DEFAULT_LAYOUT.alignItems,
        gap: container.gap ?? DEFAULT_LAYOUT.gap,
        wrap: container.wrap ?? DEFAULT_LAYOUT.wrap,
    };
}

/**
 * Compute layout for container children
 */
export function computeLayout(
    container: ContainerElement,
    children: LabelElement[],
    availableWidthMm: number,
    availableHeightMm: number,
): LayoutResult {
    const config = getLayoutConfig(container);
    const gap = config.gap;

    if (config.direction === "row") {
        return computeRowLayout(container, children, config, gap, availableWidthMm, availableHeightMm);
    } else {
        return computeColumnLayout(container, children, config, gap, availableWidthMm, availableHeightMm);
    }
}

/**
 * Compute row layout (horizontal)
 */
function computeRowLayout(
    container: ContainerElement,
    children: LabelElement[],
    config: LayoutConfig,
    gap: LayoutGap,
    availableWidthMm: number,
    availableHeightMm: number,
): LayoutResult {
    const positionedChildren: PositionedChild[] = [];
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    let maxWidth = 0;

    const isWrap = config.wrap === "wrap";
    let childrenInRow: LabelElement[] = [];

    for (const child of children) {
        const childWidth = child.widthMm;
        const childHeight = child.heightMm;
        const requiredWidth = currentX + childWidth + (childrenInRow.length > 0 ? gap : 0);

        // Check if we need to wrap
        if (isWrap && childrenInRow.length > 0 && requiredWidth > availableWidthMm) {
            // Justify current row
            const justifiedRow = justifyRow(childrenInRow, currentX - gap, config.justifyContent, gap);
            positionedChildren.push(...justifiedRow.map((pos, i) => ({
                element: childrenInRow[i],
                xMm: pos.x,
                yMm: currentY + alignY(childrenInRow[i], rowHeight, config.alignItems),
            })));

            // Start new row
            currentX = 0;
            currentY += rowHeight + gap;
            rowHeight = 0;
            childrenInRow = [];
        }

        // Add child to current row
        childrenInRow.push(child);
        currentX += childWidth + (childrenInRow.length > 1 ? gap : 0);
        rowHeight = Math.max(rowHeight, childHeight);
        maxWidth = Math.max(maxWidth, currentX);
    }

    // Justify last row
    if (childrenInRow.length > 0) {
        const justifiedRow = justifyRow(childrenInRow, currentX - gap, config.justifyContent, gap);
        positionedChildren.push(...justifiedRow.map((pos, i) => ({
            element: childrenInRow[i],
            xMm: pos.x,
            yMm: currentY + alignY(childrenInRow[i], rowHeight, config.alignItems),
        })));
    }

    return {
        children: positionedChildren,
        containerWidthMm: Math.max(availableWidthMm, maxWidth),
        containerHeightMm: Math.max(availableHeightMm, currentY + rowHeight),
    };
}

/**
 * Compute column layout (vertical)
 */
function computeColumnLayout(
    container: ContainerElement,
    children: LabelElement[],
    config: LayoutConfig,
    gap: LayoutGap,
    availableWidthMm: number,
    availableHeightMm: number,
): LayoutResult {
    const positionedChildren: PositionedChild[] = [];
    let currentX = 0;
    let currentY = 0;
    let columnWidth = 0;
    let maxHeight = 0;

    const isWrap = config.wrap === "wrap";
    let childrenInColumn: LabelElement[] = [];

    for (const child of children) {
        const childWidth = child.widthMm;
        const childHeight = child.heightMm;
        const requiredHeight = currentY + childHeight + (childrenInColumn.length > 0 ? gap : 0);

        // Check if we need to wrap
        if (isWrap && childrenInColumn.length > 0 && requiredHeight > availableHeightMm) {
            // Justify current column
            const justifiedColumn = justifyColumn(childrenInColumn, currentY - gap, config.justifyContent, gap);
            positionedChildren.push(...justifiedColumn.map((pos, i) => ({
                element: childrenInColumn[i],
                xMm: currentX + alignX(childrenInColumn[i], columnWidth, config.alignItems),
                yMm: pos.y,
            })));

            // Start new column
            currentX += columnWidth + gap;
            currentY = 0;
            columnWidth = 0;
            childrenInColumn = [];
        }

        // Add child to current column
        childrenInColumn.push(child);
        currentY += childHeight + (childrenInColumn.length > 1 ? gap : 0);
        columnWidth = Math.max(columnWidth, childWidth);
        maxHeight = Math.max(maxHeight, currentY);
    }

    // Justify last column
    if (childrenInColumn.length > 0) {
        const justifiedColumn = justifyColumn(childrenInColumn, currentY - gap, config.justifyContent, gap);
        positionedChildren.push(...justifiedColumn.map((pos, i) => ({
            element: childrenInColumn[i],
            xMm: currentX + alignX(childrenInColumn[i], columnWidth, config.alignItems),
            yMm: pos.y,
        })));
    }

    return {
        children: positionedChildren,
        containerWidthMm: Math.max(availableWidthMm, currentX + columnWidth),
        containerHeightMm: Math.max(availableHeightMm, maxHeight),
    };
}

/**
 * Justify row horizontally based on justify-content
 */
function justifyRow(
    children: LabelElement[],
    totalWidth: LayoutGap,
    justifyContent: LayoutJustifyContent,
    gap: LayoutGap,
): { x: number }[] {
    if (children.length === 0) return [];

    const positions: { x: number }[] = [];
    const totalGapWidth = (children.length - 1) * gap;

    switch (justifyContent) {
        case "flex-start":
            let startX = 0;
            for (let i = 0; i < children.length; i++) {
                positions.push({ x: startX });
                startX += children[i].widthMm + (i < children.length - 1 ? gap : 0);
            }
            break;

        case "flex-end":
            let endX = 0;
            for (let i = children.length - 1; i >= 0; i--) {
                positions[i] = { x: endX };
                endX += children[i].widthMm + (i > 0 ? gap : 0);
            }
            break;

        case "center":
            const centerOffset = totalWidth / 2;
            let centerX = centerOffset;
            for (let i = 0; i < children.length; i++) {
                positions.push({ x: centerX - children[i].widthMm / 2 });
                centerX += children[i].widthMm + (i < children.length - 1 ? gap : 0);
            }
            break;

        case "space-between":
            const spaceBetween = children.length > 1 ? (totalWidth - totalGapWidth) / (children.length - 1) : 0;
            let spaceX = 0;
            for (let i = 0; i < children.length; i++) {
                positions.push({ x: spaceX });
                spaceX += children[i].widthMm + (i < children.length - 1 ? spaceBetween + gap : 0);
            }
            break;

        case "space-around":
            const spaceAround = children.length > 0 ? (totalWidth - totalGapWidth) / children.length : 0;
            let aroundX = spaceAround / 2;
            for (let i = 0; i < children.length; i++) {
                positions.push({ x: aroundX });
                aroundX += children[i].widthMm + spaceAround + (i < children.length - 1 ? gap : 0);
            }
            break;

        case "space-evenly":
            const spaceEvenly = children.length > 0 ? (totalWidth - totalGapWidth) / (children.length + 1) : 0;
            let evenX = spaceEvenly;
            for (let i = 0; i < children.length; i++) {
                positions.push({ x: evenX });
                evenX += children[i].widthMm + spaceEvenly + (i < children.length - 1 ? gap : 0);
            }
            break;
    }

    return positions;
}

/**
 * Justify column vertically based on justify-content
 */
function justifyColumn(
    children: LabelElement[],
    totalHeight: LayoutGap,
    justifyContent: LayoutJustifyContent,
    gap: LayoutGap,
): { y: number }[] {
    if (children.length === 0) return [];

    const positions: { y: number }[] = [];
    const totalGapHeight = (children.length - 1) * gap;

    switch (justifyContent) {
        case "flex-start":
            let startY = 0;
            for (let i = 0; i < children.length; i++) {
                positions.push({ y: startY });
                startY += children[i].heightMm + (i < children.length - 1 ? gap : 0);
            }
            break;

        case "flex-end":
            let endY = 0;
            for (let i = children.length - 1; i >= 0; i--) {
                positions[i] = { y: endY };
                endY += children[i].heightMm + (i > 0 ? gap : 0);
            }
            break;

        case "center":
            const centerOffset = totalHeight / 2;
            let centerY = centerOffset;
            for (let i = 0; i < children.length; i++) {
                positions.push({ y: centerY - children[i].heightMm / 2 });
                centerY += children[i].heightMm + (i < children.length - 1 ? gap : 0);
            }
            break;

        case "space-between":
            const spaceBetween = children.length > 1 ? (totalHeight - totalGapHeight) / (children.length - 1) : 0;
            let spaceY = 0;
            for (let i = 0; i < children.length; i++) {
                positions.push({ y: spaceY });
                spaceY += children[i].heightMm + (i < children.length - 1 ? spaceBetween + gap : 0);
            }
            break;

        case "space-around":
            const spaceAround = children.length > 0 ? (totalHeight - totalGapHeight) / children.length : 0;
            let aroundY = spaceAround / 2;
            for (let i = 0; i < children.length; i++) {
                positions.push({ y: aroundY });
                aroundY += children[i].heightMm + spaceAround + (i < children.length - 1 ? gap : 0);
            }
            break;

        case "space-evenly":
            const spaceEvenly = children.length > 0 ? (totalHeight - totalGapHeight) / (children.length + 1) : 0;
            let evenY = spaceEvenly;
            for (let i = 0; i < children.length; i++) {
                positions.push({ y: evenY });
                evenY += children[i].heightMm + spaceEvenly + (i < children.length - 1 ? gap : 0);
            }
            break;
    }

    return positions;
}

/**
 * Align child vertically based on align-items
 */
function alignY(child: LabelElement, rowHeight: number, alignItems: LayoutAlignItems): number {
    switch (alignItems) {
        case "flex-start":
            return 0;
        case "flex-end":
            return rowHeight - child.heightMm;
        case "center":
            return (rowHeight - child.heightMm) / 2;
        case "stretch":
            return 0; // Child height will be set to rowHeight
        default:
            return 0;
    }
}

/**
 * Align child horizontally based on align-items
 */
function alignX(child: LabelElement, columnWidth: number, alignItems: LayoutAlignItems): number {
    switch (alignItems) {
        case "flex-start":
            return 0;
        case "flex-end":
            return columnWidth - child.widthMm;
        case "center":
            return (columnWidth - child.widthMm) / 2;
        case "stretch":
            return 0; // Child width will be set to columnWidth
        default:
            return 0;
    }
}

/**
 * Apply layout result to model elements
 */
export function applyLayoutToElements(
    container: ContainerElement,
    layoutResult: LayoutResult,
): LabelElement[] {
    return layoutResult.children.map((pos) => ({
        ...pos.element,
        xMm: container.xMm + pos.xMm,
        yMm: container.yMm + pos.yMm,
    }));
}
