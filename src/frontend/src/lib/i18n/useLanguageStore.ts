"use client";

import { create } from "zustand";
import { Locale, localeCookieName, localeStorageKey, supportedLocales } from "./messages";

type LanguageState = {
    locale: Locale;
    hydrated: boolean;
    setLocale: (locale: Locale) => void;
    hydrateFromStorageAndCookie: () => void;
};

function isLocale(value: string | null | undefined): value is Locale {
    return Boolean(value && supportedLocales.includes(value as Locale));
}

function writePersistence(locale: Locale) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(localeStorageKey, locale);
    document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

function readCookie(): Locale | null {
    if (typeof document === "undefined") {
        return null;
    }

    const match = document.cookie.match(new RegExp(`(?:^|; )${localeCookieName}=([^;]+)`));
    return isLocale(match?.[1]) ? match[1] : null;
}

function readStorage(): Locale | null {
    if (typeof window === "undefined") {
        return null;
    }

    const value = window.localStorage.getItem(localeStorageKey);
    return isLocale(value) ? value : null;
}

export const useLanguageStore = create<LanguageState>((set) => ({
    locale: "tr",
    hydrated: false,
    setLocale: (locale) => {
        writePersistence(locale);
        set({ locale, hydrated: true });
    },
    hydrateFromStorageAndCookie: () => {
        const nextLocale = readStorage() || readCookie() || "tr";

        writePersistence(nextLocale);
        set({ locale: nextLocale, hydrated: true });
    },
}));
