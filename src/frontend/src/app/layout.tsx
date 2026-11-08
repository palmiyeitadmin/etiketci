import type { Metadata } from "next";
import { cookies } from "next/headers";
// IBM Plex is self-hosted so the app works on networks without access to Google Fonts.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
import { localeCookieName, normalizeLocale } from "@/lib/i18n/messages";
import { normalizeThemePreference, themeBootScript, themeCookieName } from "@/lib/theme/theme";

export const metadata: Metadata = {
    title: "Palmiye Etiket",
    description: "Palmiye ürün etiketlerinin tasarımı, onayı ve baskısı",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = normalizeLocale(cookies().get(localeCookieName)?.value);
    const theme = normalizeThemePreference(cookies().get(themeCookieName)?.value);

    // Light and dark are known on the server; "system" is settled by the boot script before paint.
    return (
        <html lang={locale} data-theme={theme === "system" ? undefined : theme} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
            </head>
            <body className="font-sans">
                <Providers>
                    <AppShell>{children}</AppShell>
                </Providers>
            </body>
        </html>
    );
}
