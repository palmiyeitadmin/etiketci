"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LoginShowcasePanel } from "@/components/auth/LoginShowcasePanel";
import { BrandLogo } from "@/components/BrandLogo";

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
            <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink-2">
                {t("auth.login.initializing")}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas">
            <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
                <div className="order-2 lg:order-1">
                    <LoginShowcasePanel />
                </div>

                <div className="order-1 flex flex-col gap-8 lg:order-2">
                    <BrandLogo width={122} height={40} priority className="h-8 w-auto self-start" />
                    <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-lg font-medium text-ink">{t("auth.login.title")}</h1>
                            <p className="text-sm text-ink-2">{t("auth.login.subtitle")}</p>
                        </div>

                        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                            {error ? (
                                <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                                    {error}
                                </div>
                            ) : null}

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="login-email" className="plms-label">{t("auth.login.email")}</label>
                                <input
                                    id="login-email"
                                    type="email"
                                    autoComplete="username"
                                    required
                                    className="plms-input"
                                    placeholder="ad.soyad@palmiye.com.tr"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="login-password" className="plms-label">{t("auth.login.password")}</label>
                                <input
                                    id="login-password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="plms-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <button type="submit" disabled={loading} className="plms-button-primary mt-2 h-10 w-full">
                                {loading ? t("auth.login.loading") : t("auth.login.authorize")}
                            </button>
                        </form>

                        <p className="text-sm text-ink-3">{t("auth.login.governanceNote")}</p>
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
            <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink-2">
                {t("auth.login.initializing")}
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
