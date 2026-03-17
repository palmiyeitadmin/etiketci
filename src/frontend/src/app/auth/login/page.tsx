"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function mapSignInError(errorCode?: string): string {
    if (!errorCode) return "";

    if (errorCode === "CredentialsSignin") {
        return "Email veya parola hatali.";
    }

    if (errorCode === "AUTH_BACKEND_UNREACHABLE") {
        return "API'ye ulasilamiyor. Backend calisiyor mu?";
    }

    if (/^AUTH_BACKEND_HTTP_5\d{2}$/.test(errorCode)) {
        return "Backend hatasi olustu.";
    }

    if (/^AUTH_BACKEND_HTTP_\d{3}$/.test(errorCode)) {
        return "Kimlik dogrulama servisi yanit vermedi.";
    }

    if (errorCode === "AUTH_BACKEND_INVALID_RESPONSE") {
        return "Kimlik dogrulama servisi gecersiz yanit dondurdu.";
    }

    return "Giris islemi sirasinda beklenmeyen bir hata olustu.";
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl
            });

            if (result?.error) {
                setError(mapSignInError(result.error));
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err) {
            setError("A network error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl">
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                        PLMS Identity Gateway
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Sign In</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Local authentication shell</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 text-red-600 text-[11px] font-bold p-4 rounded-2xl border border-red-100 uppercase tracking-tight">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Corporate Email</label>
                            <input
                                type="email"
                                required
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="name@domain.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Password</label>
                            <input
                                type="password"
                                required
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xs font-black uppercase tracking-[0.2em] rounded-2xl text-white bg-slate-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all disabled:opacity-50"
                        >
                            {loading ? "Initializing..." : "Authorize Session"}
                        </button>
                    </div>
                </form>

                <div className="text-center pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed italic">
                        By signing in, you agree to the enterprise data governance policies of PLMS.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-black uppercase tracking-widest italic">
                Cortex Auth Initializing...
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
