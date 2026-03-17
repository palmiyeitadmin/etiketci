"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/lib/i18n";

export function LanguageBootstrap() {
    const hydrateFromStorageAndCookie = useLanguageStore((state) => state.hydrateFromStorageAndCookie);
    const hydrated = useLanguageStore((state) => state.hydrated);

    useEffect(() => {
        if (!hydrated) {
            hydrateFromStorageAndCookie();
        }
    }, [hydrateFromStorageAndCookie, hydrated]);

    return null;
}
