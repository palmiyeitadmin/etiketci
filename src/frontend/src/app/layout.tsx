import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
import { localeCookieName, normalizeLocale } from "@/lib/i18n/messages";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Palmiye Label Management System (PLMS)",
    description: "Epson-centric Label Management System MVP",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = normalizeLocale(cookies().get(localeCookieName)?.value);

    return (
        <html lang={locale}>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Roboto:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
            </head>
            <body className={inter.className}>
                <Providers>
                    <AppShell>{children}</AppShell>
                </Providers>
            </body>
        </html>
    );
}
