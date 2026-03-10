/**
 * Renderer Profiles define context-specific expectations for resolution, scaling, and snapping.
 */

export interface RenderProfile {
    dpi: number;
    roundToGrid: boolean;
    defaultSnapMm?: number;
}

export const ScreenPreviewProfile: RenderProfile = {
    dpi: 96,
    roundToGrid: true,
    defaultSnapMm: 1.0
};

export const PdfRenderProfile: RenderProfile = {
    dpi: 72, // Standard PDF points per inch
    roundToGrid: false
};

export const PrinterProfile: RenderProfile = {
    dpi: 1200, // Epson CW-C4000e standard
    roundToGrid: true
};

export const MM_PER_INCH = 25.4;

export const UnitConverter = {
    /**
     * Converts millimeters to target profile pixels/points.
     */
    mmToProfile(mm: number, profile: RenderProfile, zoom: number = 1): number {
        const value = (mm * profile.dpi) / MM_PER_INCH * zoom;
        return profile.roundToGrid ? Math.round(value) : value;
    },

    /**
     * Converts target profile pixels/points to millimeters.
     */
    profileToMm(value: number, profile: RenderProfile, zoom: number = 1): number {
        return (value * MM_PER_INCH) / (profile.dpi * zoom);
    },

    /**
     * Snaps a value to a specified grid.
     */
    snapToGrid(value: number, snapMm: number): number {
        if (snapMm <= 0) return value;
        return Math.round(value / snapMm) * snapMm;
    },

    /**
     * Enforces strict two-decimal precision for canonical storage.
     */
    toPersisted(valueMm: number): number {
        return Math.round(valueMm * 100) / 100;
    }
};
