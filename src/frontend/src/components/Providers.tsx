"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageBootstrap } from "@/components/LanguageBootstrap";
import { LanguageHtmlSync } from "@/components/LanguageHtmlSync";
import { ThemeSync } from "@/components/ThemeSync";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <LanguageBootstrap />
            <LanguageHtmlSync />
            <ThemeSync />
            {children}
        </SessionProvider>
    );
}
