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
            <body className={inter.className}>
                <Providers>
                    <AppShell>{children}</AppShell>
                </Providers>
            </body>
        </html>
    );
}
