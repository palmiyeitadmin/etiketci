import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Palmiye Label Management System (PLMS)",
    description: "Epson-centric Label Management System MVP",
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers>
                    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                        {children}
                    </main>
                </Providers>
            </body>
        </html>
    );
}
