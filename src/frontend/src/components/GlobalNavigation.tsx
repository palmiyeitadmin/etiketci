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
        { label: "Approval Queue", href: "/approvals", roles: ["Admin", "Reviewer"] },
    ];

    const userRoles = (session.user as any).roles || [];
    const filteredNav = navItems.filter(item => 
        !item.roles || item.roles.some(role => userRoles.includes(role))
    );

    return (
        <nav className="w-full bg-slate-900 border-b border-slate-800 z-10 sticky top-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center mr-10">
                            <span className="text-xl font-black text-blue-500 tracking-tighter">PLMS</span>
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-[10px] font-bold text-white rounded uppercase tracking-widest">MVP</span>
                        </div>
                        <div className="hidden sm:-my-px sm:flex sm:space-x-8">
                            {filteredNav.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-xs font-bold uppercase tracking-widest transition-all ${pathname === item.href
                                            ? "border-blue-500 text-white"
                                            : "border-transparent text-slate-400 hover:text-slate-100 hover:border-slate-700"
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-300 leading-none">{session.user?.name}</span>
                            <span className="text-[9px] text-blue-400 font-mono tracking-tighter uppercase mt-1">
                                {userRoles.join(" | ") || "OPERATOR"}
                            </span>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1.5 rounded hover:bg-slate-700 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

