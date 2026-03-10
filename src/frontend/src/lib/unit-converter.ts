/**
 * Centralized UnitConverter for PLMS.
 * Source of truth for geometry persistence is always Millimeters (mm).
 */

export const SCREEN_DPI = 96;
export const PRINTER_DPI = 1200; // Epson CW-C4000e standard
export const MM_PER_INCH = 25.4;

export const UnitConverter = {
    /**
     * Converts millimeters to screen pixels at 96 DPI.
     */
    mmToPx(mm: number): number {
        return (mm * SCREEN_DPI) / MM_PER_INCH;
    },

    /**
     * Converts screen pixels back to millimeters at 96 DPI.
     */
    pxToMm(px: number): number {
        return (px * MM_PER_INCH) / SCREEN_DPI;
    },

    /**
     * Converts millimeters to printer dots at 1200 DPI.
     */
    mmToDot(mm: number): number {
        return Math.round((mm * PRINTER_DPI) / MM_PER_INCH);
    },

    /**
     * Formats a number to a fixed precision for persistence.
     */
    toPersisted(value: number): number {
        return Math.round(value * 100) / 100; // 2 decimal places for mm
    },

    /**
     * Snaps a value to a grid (in mm).
     */
    snapToGrid(value: number, gridStepMm: number = 1): number {
        return Math.round(value / gridStepMm) * gridStepMm;
    }
};
