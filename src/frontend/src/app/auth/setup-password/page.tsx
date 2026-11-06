"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react";
import { buildApiUrl } from "@/lib/api-base-url";
import { useI18n } from "@/lib/i18n";

function useSetupText() {
    const { locale } = useI18n();
    return locale === "tr"
        ? {
            invalidToken: "Kurulum bağlantısı geçersiz veya eksik. Yöneticinizden yeni bir bağlantı isteyin.",
            mismatch: "Parolalar eşleşmiyor",
            failed: "Parola belirlenemedi",
            networkError: "Sunucuya ulaşılamadı, tekrar deneyin",
            setupComplete: "Hesabınız hazır",
            redirecting: "Giriş ekranına yönlendiriliyorsunuz",
            title: "Parola belirleyin",
            subtitle: "Hesabınızı etkinleştirmek için bir parola seçin",
            newPassword: "Yeni parola",
            newPasswordHint: "En az 8 karakter",
            confirmNewPassword: "Yeni parola tekrar",
            activating: "Etkinleştiriliyor",
            enableAccount: "Hesabı etkinleştir",
            initializing: "Yükleniyor",
        }
        : {
            invalidToken: "The setup link is invalid or incomplete. Ask your administrator for a new one.",
            mismatch: "The passwords do not match",
            failed: "The password could not be set",
            networkError: "The server could not be reached, try again",
            setupComplete: "Your account is ready",
            redirecting: "Taking you to sign in",
            title: "Set your password",
            subtitle: "Choose a password to activate your account",
            newPassword: "New password",
            newPasswordHint: "At least 8 characters",
            confirmNewPassword: "Repeat new password",
            activating: "Activating",
            enableAccount: "Activate account",
            initializing: "Loading",
        };
}

function AuthFrame({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
            <div className="flex w-full max-w-sm flex-col gap-8">
                <Image src="/assets/palmiye_logo_dark.png" alt="Palmiye" width={122} height={40} priority className="h-8 w-auto self-start" />
                <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">{children}</div>
            </div>
        </div>
    );
}

function SetupPasswordContent() {
    const text = useSetupText();
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!email || !token) {
            setError(text.invalidToken);
        }
    }, [email, text.invalidToken, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError(text.mismatch);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch(buildApiUrl("/api/auth/setup-password"), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, newPassword: password })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                setSuccess(true);
                setTimeout(() => router.push("/auth/login"), 3000);
            } else {
                setError(result.error || result.errors?.join(", ") || text.failed);
            }
        } catch (err) {
            setError(text.networkError);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthFrame>
                <div role="status" className="flex flex-col gap-3">
                    <CheckCircle size={24} aria-hidden className="text-good" />
                    <div className="flex flex-col gap-1">
                        <h1 className="text-lg font-medium text-ink">{text.setupComplete}</h1>
                        <p className="text-sm text-ink-2">{text.redirecting}</p>
                    </div>
                </div>
            </AuthFrame>
        );
    }

    return (
        <AuthFrame>
            <div className="flex flex-col gap-1">
                <h1 className="text-lg font-medium text-ink">{text.title}</h1>
                <p className="text-sm text-ink-2">{email || text.subtitle}</p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {error && (
                    <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="setup-password" className="plms-label">{text.newPassword}</label>
                    <input
                        id="setup-password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        aria-describedby="setup-password-hint"
                        className="plms-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span id="setup-password-hint" className="text-xs text-ink-3">{text.newPasswordHint}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="setup-password-confirm" className="plms-label">{text.confirmNewPassword}</label>
                    <input
                        id="setup-password-confirm"
                        type="password"
                        required
                        autoComplete="new-password"
                        className="plms-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <button type="submit" disabled={loading || !email || !token} className="plms-button-primary mt-2 h-10 w-full">
                    {loading ? text.activating : text.enableAccount}
                </button>
            </form>
        </AuthFrame>
    );
}

export default function SetupPasswordPage() {
    const text = useSetupText();

    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink-2">
                {text.initializing}
            </div>
        }>
            <SetupPasswordContent />
        </Suspense>
    );
}
