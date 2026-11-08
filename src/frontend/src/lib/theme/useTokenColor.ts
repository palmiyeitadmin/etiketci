"use client";

import { useMemo } from "react";
import { useThemeStore } from "./useThemeStore";

/** `rgb(...)` for a design token (a CSS variable holding RGB channels), optionally with alpha. */
export function readTokenColor(name: string, alpha?: number) {
    if (typeof window === "undefined") return "transparent";
    const channels = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
    if (!channels) return "transparent";
    return alpha === undefined ? `rgb(${channels})` : `rgb(${channels} / ${alpha})`;
}

/**
 * Token colours for canvas and chart code that cannot use CSS classes (Konva, Recharts).
 * Re-reads when the theme changes.
 */
export function useTokenColors<T extends Record<string, { token: string; alpha?: number }>>(spec: T): { [K in keyof T]: string } {
    const resolved = useThemeStore((state) => state.resolved);
    const hydrated = useThemeStore((state) => state.hydrated);
    const key = JSON.stringify(spec);
    return useMemo(() => {
        const result = {} as { [K in keyof T]: string };
        for (const name of Object.keys(spec) as (keyof T)[]) {
            result[name] = readTokenColor(spec[name].token, spec[name].alpha);
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, resolved, hydrated]);
}
