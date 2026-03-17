"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildApiUrl } from "@/lib/api-base-url";
import { useI18n } from "@/lib/i18n";

function SetupPasswordContent() {
    const { t } = useI18n();
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
            setError(t("auth.setupPassword.invalidToken"));
        }
    }, [email, t, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError(t("auth.setupPassword.mismatch"));
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
                setError(result.error || result.errors?.join(", ") || t("auth.setupPassword.failed"));
            }
        } catch (err) {
            setError(t("auth.setupPassword.networkError"));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-6">
                <div className="w-full max-w-md text-center p-12 bg-white rounded-[2.5rem] shadow-xl border-2 border-emerald-100">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">✓</div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{t("auth.setupPassword.setupComplete")}</h1>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest italic leading-relaxed">
                        {t("auth.setupPassword.redirecting")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50 p-6">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl">
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                        {t("auth.setupPassword.activation")}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">{t("auth.setupPassword.title")}</h1>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">{email}</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 text-red-600 text-[11px] font-bold p-4 rounded-2xl border border-red-100 uppercase tracking-tight">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("auth.setupPassword.newPassword")}</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("auth.setupPassword.confirmNewPassword")}</label>
                            <input
                                type="password"
                                required
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !!error}
                            className="w-full py-4 px-4 border border-transparent text-xs font-black uppercase tracking-[0.2em] rounded-2xl text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                        >
                            {loading ? t("auth.setupPassword.activating") : t("auth.setupPassword.enableAccount")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function SetupPasswordPage() {
    const { t } = useI18n();

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-blue-50 text-blue-600 font-black uppercase tracking-widest italic">
                {t("auth.setupPassword.initializing")}
            </div>
        }>
            <SetupPasswordContent />
        </Suspense>
    );
}
