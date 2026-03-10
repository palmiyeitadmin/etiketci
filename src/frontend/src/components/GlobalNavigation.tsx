"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export function GlobalNavigation() {
    const pathname = usePathname();
    const { data: session } = useSession();

    if (!session) return null;

    const navItems = [
        { label: "Dashboard", href: "/" },
        { label: "Products", href: "/products" },
        { label: "Templates", href: "/templates" },
        { label: "Print Intents", href: "/print-intents" },
    ];

    return (
        <nav className="w-full bg-white border-b border-gray-200 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center mr-8">
                            <span className="text-xl font-bold text-blue-600">PLMS</span>
                        </div>
                        <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === item.href
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-4">{session.user?.name}</span>
                        <button
                            onClick={() => signOut()}
                            className="text-xs bg-gray-50 border px-3 py-1 rounded hover:bg-gray-100"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
