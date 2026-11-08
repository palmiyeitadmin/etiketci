"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/theme/useThemeStore";

/** Reads the saved theme, keeps <html data-theme> in step with it and follows the OS when set to "system". */
export function ThemeSync() {
    const hydrated = useThemeStore((state) => state.hydrated);
    const hydrate = useThemeStore((state) => state.hydrate);
    const resolved = useThemeStore((state) => state.resolved);
    const preference = useThemeStore((state) => state.preference);
    const setSystemDark = useThemeStore((state) => state.setSystemDark);

    useEffect(() => {
        if (!hydrated) hydrate();
    }, [hydrate, hydrated]);

    useEffect(() => {
        if (hydrated) document.documentElement.dataset.theme = resolved;
    }, [hydrated, resolved]);

    useEffect(() => {
        if (preference !== "system") return;
        const query = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
        query.addEventListener("change", onChange);
        return () => query.removeEventListener("change", onChange);
    }, [preference, setSystemDark]);

    return null;
}
