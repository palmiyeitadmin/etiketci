"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LoginShowcasePanel } from "@/components/auth/LoginShowcasePanel";

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
    const { status } = useSession();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/");
        }
    }, [router, status]);

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

    if (status === "authenticated") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                    {t("auth.login.initializing")}
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_24%),linear-gradient(180deg,#040b16_0%,#091221_48%,#060d17_100%)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_22%),radial-gradient(circle_at_80%_10%,rgba(37,99,235,0.08),transparent_20%)]" />
            <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-8 lg:px-10 lg:py-12">
                <div className="w-full lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 xl:gap-12">
                    <LoginShowcasePanel />

                    <div className="flex items-center justify-center">
                        <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.4)] sm:p-10">
                            <div className="text-center">
                                <div className="inline-block rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                                    {t("auth.login.gateway")}
                                </div>
                                <h1 className="mb-2 mt-5 text-4xl font-black uppercase tracking-tighter text-slate-900">
                                    {t("auth.login.title")}
                                </h1>
                                <p className="text-xs font-bold uppercase tracking-widest italic text-slate-500">
                                    {t("auth.login.subtitle")}
                                </p>
                            </div>

                            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                                {error ? (
                                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-[11px] font-bold uppercase tracking-tight text-red-600">
                                        {error}
                                    </div>
                                ) : null}

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="login-email" className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {t("auth.login.email")}
                                        </label>
                                        <input
                                            id="login-email"
                                            type="email"
                                            required
                                            className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-bold placeholder-slate-300 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                                            placeholder="name@domain.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="login-password" className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {t("auth.login.password")}
                                        </label>
                                        <input
                                            id="login-password"
                                            type="password"
                                            required
                                            className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 font-bold placeholder-slate-300 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
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
                                        className="group relative flex w-full justify-center rounded-2xl border border-transparent bg-slate-900 px-4 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
                                    >
                                        {loading ? t("auth.login.loading") : t("auth.login.authorize")}
                                    </button>
                                </div>
                            </form>

                            <div className="border-t border-slate-100 pt-4 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest italic leading-relaxed text-slate-400">
                                    {t("auth.login.governanceNote")}
                                </p>
                            </div>
                        </div>
                    </div>
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
