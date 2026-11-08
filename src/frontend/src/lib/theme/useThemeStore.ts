"use client";

import { create } from "zustand";
import { normalizeThemePreference, ResolvedTheme, themeCookieName, ThemePreference, themeStorageKey } from "./theme";

type ThemeState = {
    preference: ThemePreference;
    resolved: ResolvedTheme;
    hydrated: boolean;
    setPreference: (preference: ThemePreference) => void;
    hydrate: () => void;
    setSystemDark: (dark: boolean) => void;
};

const systemDark = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;

function resolve(preference: ThemePreference, dark = systemDark()): ResolvedTheme {
    if (preference === "system") return dark ? "dark" : "light";
    return preference;
}

function persist(preference: ThemePreference) {
    try {
        window.localStorage.setItem(themeStorageKey, preference);
    } catch {
        // Private windows can refuse storage; the cookie still carries the choice.
    }
    document.cookie = `${themeCookieName}=${preference}; path=/; max-age=31536000; samesite=lax`;
}

function readSaved(): ThemePreference {
    const cookie = document.cookie.match(new RegExp(`(?:^|; )${themeCookieName}=([^;]+)`))?.[1];
    let stored: string | null = null;
    try {
        stored = window.localStorage.getItem(themeStorageKey);
    } catch {
        stored = null;
    }
    return normalizeThemePreference(cookie ?? stored);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    preference: "light",
    resolved: "light",
    hydrated: false,
    setPreference: (preference) => {
        persist(preference);
        set({ preference, resolved: resolve(preference), hydrated: true });
    },
    hydrate: () => {
        const preference = readSaved();
        set({ preference, resolved: resolve(preference), hydrated: true });
    },
    setSystemDark: (dark) => {
        const { preference } = get();
        if (preference === "system") set({ resolved: dark ? "dark" : "light" });
    },
}));
