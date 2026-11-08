"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BrandLogo } from "@/components/BrandLogo";
import { CheckCircle } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api-client";
import { useText } from "@/lib/i18n";

export default function ForceChangePasswordPage() {
  const text = useText("auth").forceChange;
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
      setError(text.mismatch);
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

    setMessage(text.success);
    setTimeout(() => {
      signOut({ callbackUrl: "/auth/login" });
    }, 1200);
  }

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink-2">{text.loading}</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <BrandLogo width={122} height={40} priority className="h-8 w-auto self-start" />
        <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-medium text-ink">{text.title}</h1>
            <p className="text-sm text-ink-2">{text.description}</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error ? <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div> : null}
            {message ? (
              <div role="status" className="flex items-start gap-2 rounded-lg bg-good-soft px-3 py-2 text-sm text-good">
                <CheckCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
                {message}
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="current-password" className="plms-label">{text.currentPassword}</label>
              <input id="current-password" className="plms-input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="plms-label">{text.newPassword}</label>
              <input id="new-password" className="plms-input" type="password" autoComplete="new-password" aria-describedby="new-password-hint" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
              <span id="new-password-hint" className="text-xs text-ink-3">{text.newPasswordHint}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="plms-label">{text.confirmPassword}</label>
              <input id="confirm-password" className="plms-input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
            </div>
            <button className="plms-button-primary mt-2 h-10 w-full" type="submit" disabled={busy}>{busy ? text.updating : text.submit}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
