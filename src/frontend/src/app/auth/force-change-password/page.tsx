"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";

export default function ForceChangePasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mustChangePassword = Boolean((session?.user as any)?.mustChangePassword);

  useEffect(() => {
    if (status === "authenticated" && !mustChangePassword) {
      router.replace("/");
    }
  }, [mustChangePassword, router, status]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t("auth.forcePassword.mismatch"));
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const response = await apiFetch<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setBusy(false);

    if (!response.success) {
      setError(response.error.message);
      return;
    }

    setMessage(t("auth.forcePassword.success"));
    setTimeout(() => {
      signOut({ callbackUrl: "/auth/login" });
    }, 1200);
  }

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">{t("auth.forcePassword.loading")}</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-8 shadow-[0_25px_90px_rgba(15,23,42,0.35)]">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("auth.forcePassword.securityAction")}</div>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{t("auth.forcePassword.title")}</h1>
        <p className="mt-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
          {t("auth.forcePassword.description")}
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-200">{error}</div> : null}
          {message ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-200">{message}</div> : null}
          <input className="plms-input" type="password" placeholder={t("auth.forcePassword.currentPassword")} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          <input className="plms-input" type="password" placeholder={t("auth.forcePassword.newPassword")} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
          <input className="plms-input" type="password" placeholder={t("auth.forcePassword.confirmPassword")} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
          <button className="plms-button-primary w-full" type="submit" disabled={busy}>{busy ? t("auth.forcePassword.updating") : t("auth.forcePassword.submit")}</button>
        </form>
      </div>
    </div>
  );
}
