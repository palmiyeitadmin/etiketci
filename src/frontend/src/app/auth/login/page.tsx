"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";

function mapSignInError(
    errorCode: string | undefined,
    messages: {
        invalidCredentials: string;
        backendUnreachable: string;
        backendError: string;
        serviceUnavailable: string;
        invalidResponse: string;
        fallback: string;
    }
): string {
    if (!errorCode) return "";

    if (errorCode === "CredentialsSignin") {
        return messages.invalidCredentials;
    }

    if (errorCode === "AUTH_BACKEND_UNREACHABLE") {
        return messages.backendUnreachable;
    }

    if (/^AUTH_BACKEND_HTTP_5\d{2}$/.test(errorCode)) {
        return messages.backendError;
    }

    if (/^AUTH_BACKEND_HTTP_\d{3}$/.test(errorCode)) {
        return messages.serviceUnavailable;
    }

    if (errorCode === "AUTH_BACKEND_INVALID_RESPONSE") {
        return messages.invalidResponse;
    }

    return messages.fallback;
}

function LoginContent() {
    const { t } = useI18n();
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
                setError(mapSignInError(result.error, {
                    invalidCredentials: t("auth.login.invalidCredentials", "Invalid email or password."),
                    backendUnreachable: t("auth.login.backendUnreachable", "API is unreachable. Is the backend running?"),
                    backendError: t("auth.login.backendError", "A backend error occurred."),
                    serviceUnavailable: t("auth.login.serviceUnavailable", "Authentication service did not respond."),
                    invalidResponse: t("auth.login.invalidResponse", "Authentication service returned an invalid response."),
                    fallback: t("auth.login.defaultError"),
                }));
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch (err) {
            setError(t("auth.login.networkError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl">
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                        {t("auth.login.gateway")}
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">{t("auth.login.title")}</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">{t("auth.login.subtitle")}</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 text-red-600 text-[11px] font-bold p-4 rounded-2xl border border-red-100 uppercase tracking-tight">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("auth.login.email")}</label>
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("auth.login.password")}</label>
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
                            {loading ? t("auth.login.loading") : t("auth.login.authorize")}
                        </button>
                    </div>
                </form>

                <div className="text-center pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed italic">
                        {t("auth.login.governanceNote")}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    const { t } = useI18n();

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-black uppercase tracking-widest italic">
                {t("auth.login.initializing")}
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
