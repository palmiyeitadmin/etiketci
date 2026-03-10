"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
    const { data: session, status } = useSession();

    return (
        <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="bg-white p-12 rounded-2xl shadow-xl max-w-2xl text-center space-y-6">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    Palmiye Label Management System <span className="text-blue-600">(PLMS)</span>
                </h1>

                {status === "loading" ? (
                    <p className="text-gray-500 animate-pulse">Loading auth state...</p>
                ) : session ? (
                    <div className="space-y-4">
                        <p className="text-lg text-green-700 font-medium">
                            Signed in as {session.user?.name || session.user?.email}
                        </p>
                        <div className="inline-block bg-blue-50 text-blue-800 text-sm py-2 px-4 rounded-xl border border-blue-200">
                            Active Roles: {(session.user as any).roles?.join(", ") || "None"}
                        </div>
                        <div>
                            <button
                                onClick={() => signOut()}
                                className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-lg text-gray-600">
                            You are currently signed out.
                        </p>
                        <div>
                            <button
                                onClick={() => signIn("azure-ad")}
                                className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                Sign In with Microsoft Entra ID
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 max-w-sm mx-auto mt-8 opacity-75">
                    <div className="bg-gray-100 text-gray-800 text-xs py-2 px-3 rounded-md font-mono shadow-inner">
                        Epson CW-C4000e PDF Print Flow Ready
                    </div>
                    <div className="bg-gray-100 text-gray-800 text-xs py-2 px-3 rounded-md font-mono shadow-inner">
                        NextAuth & MSAL Integrated Shell
                    </div>
                </div>
            </div>
        </div>
    );
}
