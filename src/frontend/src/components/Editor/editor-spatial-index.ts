/**
 * Spatial Index for Advanced Guides
 * 
 * Provides efficient spatial queries for guide system.
 * Reduces O(N²) algorithms to O(log N) using spatial partitioning.
 * 
 * @module editor-spatial-index
 */

import type { LabelElement } from "@/types/canvas";

export interface SpatialNode {
    element: LabelElement;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
}

interface SpatialIndex {
    width: number;
    height: number;
    cells: SpatialNode[][][];
    cellWidth: number;
    cellHeight: number;
    cols: number;
    rows: number;
}

/**
 * Create spatial index for efficient element queries
 * 
 * @param elements - All elements to index
 * @param width - Available width (canvas width)
 * @param height - Available height (canvas height)
 * @param cellSize - Size of each spatial cell in mm (default: 20mm)
 * @returns Spatial index for queries
 */
export function createSpatialIndex(
    elements: LabelElement[],
    width: number,
    height: number,
    cellSize: number = 20
): SpatialIndex {
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    // Initialize grid
    const cells: SpatialNode[][][] = [];
    for (let y = 0; y < rows; y++) {
        cells[y] = [];
        for (let x = 0; x < cols; x++) {
            cells[y][x] = [];
        }
    }

    // Add elements to cells
    for (const element of elements) {
        if (!element.visible && element.visible === false) continue;

        const node: SpatialNode = {
            element,
            xMm: element.xMm,
            yMm: element.yMm,
            widthMm: element.widthMm,
            heightMm: element.heightMm,
            left: element.xMm,
            right: element.xMm + element.widthMm,
            top: element.yMm,
            bottom: element.yMm + element.heightMm,
        };

        // Add element to all cells it overlaps
        const startCol = Math.floor(element.xMm / cellSize);
        const endCol = Math.floor((element.xMm + element.widthMm) / cellSize);
        const startRow = Math.floor(element.yMm / cellSize);
        const endRow = Math.floor((element.yMm + element.heightMm) / cellSize);

        for (let row = startRow; row <= endRow && row < rows; row++) {
            for (let col = startCol; col <= endCol && col < cols; col++) {
                cells[row][col].push(node);
            }
        }
    }

    return {
        width,
        height,
        cells,
        cellWidth,
        cellHeight,
        cols,
        rows,
    };
}

/**
 * Query elements overlapping with a region
 * 
 * @param index - Spatial index
 * @param x - Left edge
 * @param y - Top edge
 * @param width - Region width
 * @param height - Region height
 * @returns Elements in the region (may include false positives)
 */
export function queryRegion(
    index: SpatialIndex,
    x: number,
    y: number,
    width: number,
    height: number
): SpatialNode[] {
    const result: SpatialNode[] = [];
    const startCol = Math.floor(x / index.cellWidth);
    const endCol = Math.floor((x + width) / index.cellWidth);
    const startRow = Math.floor(y / index.cellHeight);
    const endRow = Math.floor((y + height) / index.cellHeight);

    const seen = new Set<string>();

    for (let row = startRow; row <= endRow && row < index.rows; row++) {
        for (let col = startCol; col <= endCol && col < index.cols; col++) {
            for (const node of index.cells[row][col]) {
                if (seen.has(node.element.id)) continue;
                seen.add(node.element.id);

                // Check actual overlap (filter false positives)
                if (
                    x < node.right &&
                    x + width > node.left &&
                    y < node.bottom &&
                    y + height > node.top
                ) {
                    result.push(node);
                }
            }
        }
    }

    return result;
}

/**
 * Query elements potentially aligning with a value
 * 
 * @param index - Spatial index
 * @param value - X or Y value to query
 * @param threshold - Max distance in mm
 * @param isHorizontal - Query for horizontal (X) or vertical (Y) alignment
 * @returns Elements within threshold distance
 */
export function queryNearbyElements(
    index: SpatialIndex,
    value: number,
    threshold: number,
    isHorizontal: boolean
): SpatialNode[] {
    const result: SpatialNode[] = [];
    const margin = threshold;
    const queryX = isHorizontal ? value - margin : 0;
    const queryY = isHorizontal ? 0 : value - margin;
    const queryWidth = isHorizontal ? threshold * 2 : index.width;
    const queryHeight = isHorizontal ? index.height : threshold * 2;

    const nodes = queryRegion(index, queryX, queryY, queryWidth, queryHeight);

    // Filter by alignment proximity
    for (const node of nodes) {
        const isNearby = isHorizontal
            ? Math.abs(node.left - value) <= threshold ||
              Math.abs(node.right - value) <= threshold ||
              Math.abs((node.left + node.widthMm / 2) - value) <= threshold
            : Math.abs(node.top - value) <= threshold ||
              Math.abs(node.bottom - value) <= threshold ||
              Math.abs((node.top + node.heightMm / 2) - value) <= threshold;

        if (isNearby) {
            result.push(node);
        }
    }

    return result;
}

/**
 * Query all elements
 * 
 * @param index - Spatial index
 * @returns All elements in index
 */
export function queryAll(index: SpatialIndex): SpatialNode[] {
    const result: SpatialNode[] = [];
    const seen = new Set<string>();

    for (let row = 0; row < index.rows; row++) {
        for (let col = 0; col < index.cols; col++) {
            for (const node of index.cells[row][col]) {
                if (seen.has(node.element.id)) continue;
                seen.add(node.element.id);
                result.push(node);
            }
        }
    }

    return result;
}
