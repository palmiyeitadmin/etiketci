"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageBootstrap } from "@/components/LanguageBootstrap";
import { LanguageHtmlSync } from "@/components/LanguageHtmlSync";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <LanguageBootstrap />
            <LanguageHtmlSync />
            {children}
        </SessionProvider>
    );
}
