"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/lib/i18n";

export function LanguageHtmlSync() {
    const locale = useLanguageStore((state) => state.locale);

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    return null;
}
