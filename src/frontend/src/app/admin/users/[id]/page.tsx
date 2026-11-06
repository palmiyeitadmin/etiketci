"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api-client";
import { PermissionGuard } from "@/components/PermissionGuard";
import { permissions } from "@/lib/permissions";
import { RoleSummary, UserSummary } from "@/types/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useI18n } from "@/lib/i18n";

export default function AdminUserDetailPage() {
  const { locale } = useI18n();
  const text = locale === "tr"
    ? {
        parent: "Kullanıcılar",
        user: "Kullanıcı",
        notFound: "Kullanıcı bulunamadı",
        notFoundDescription: "Bu kullanıcı kaydı yüklenemedi.",
        profile: "Hesap",
        fullName: "Ad soyad",
        activeUser: "Hesap aktif",
        roles: "Roller",
        permissionsCount: "{count} yetki",
        save: "Değişiklikleri kaydet",
        updated: "Kullanıcı güncellendi",
        password: "Parola",
        passwordHint: "Kurulum bağlantısıyla kullanıcı parolasını kendisi belirler. Geçici parolada ilk girişte değiştirmesi istenir.",
        issueSetupLink: "Kurulum bağlantısı oluştur",
        setupLinkIssued: "Yeni kurulum bağlantısı oluşturuldu",
        setupLink: "Kurulum bağlantısı",
        temporaryPassword: "Geçici parola",
        setTempPassword: "Geçici parolayı ata",
        tempPasswordIssued: "Geçici parola atandı",
        or: "veya",
        effective: "Geçerli yetkiler",
        more: (n: number) => `+${n} yetki daha`,
        active: "Aktif",
        inactive: "Pasif",
      }
    : {
        parent: "Users",
        user: "User",
        notFound: "User not found",
        notFoundDescription: "This user record could not be loaded.",
        profile: "Account",
        fullName: "Full name",
        activeUser: "Account active",
        roles: "Roles",
        permissionsCount: "{count} permissions",
        save: "Save changes",
        updated: "User updated",
        password: "Password",
        passwordHint: "With a setup link the user picks their own password. A temporary password must be changed on first sign-in.",
        issueSetupLink: "Create setup link",
        setupLinkIssued: "A new setup link was created",
        setupLink: "Setup link",
        temporaryPassword: "Temporary password",
        setTempPassword: "Set temporary password",
        tempPasswordIssued: "Temporary password set",
        or: "or",
        effective: "Effective permissions",
        more: (n: number) => `+${n} more`,
        active: "Active",
        inactive: "Inactive",
      };
  const params = useParams();
  const id = String(params.id);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [directPassword, setDirectPassword] = useState("");
  const [form, setForm] = useState({ fullName: "", isActive: true, roleIds: [] as string[] });

  async function load() {
    setLoading(true);
    const [userResponse, roleResponse] = await Promise.all([
      apiFetch<UserSummary>(`/api/users/${id}`),
      apiFetch<RoleSummary[]>("/api/roles"),
    ]);

    if (userResponse.success) {
      setUser(userResponse.data);
      setForm({
        fullName: userResponse.data.fullName,
        isActive: userResponse.data.isActive,
        roleIds: userResponse.data.roles.map((role) => role.id),
      });
    }

    if (roleResponse.success) {
      setRoles(roleResponse.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveChanges() {
    const response = await apiFetch<UserSummary>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });

    if (!response.success) {
      setMessage({ tone: "bad", text: response.error.message });
      return;
    }

    setMessage({ tone: "good", text: text.updated });
    setUser(response.data);
  }

  async function issueInviteReset() {
    const response = await apiFetch<{ setupLink: string }>(`/api/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ mode: "invite-reset" }),
    });

    if (!response.success) {
      setMessage({ tone: "bad", text: response.error.message });
      return;
    }

    setSetupLink(response.data.setupLink);
    setMessage({ tone: "good", text: text.setupLinkIssued });
  }

  async function issueTempPassword() {
    const response = await apiFetch(`/api/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ mode: "admin-set-temp-password", password: directPassword }),
    });

    if (!response.success) {
      setMessage({ tone: "bad", text: response.error.message });
      return;
    }

    setDirectPassword("");
    setMessage({ tone: "good", text: text.tempPasswordIssued });
    setSetupLink(null);
    await load();
  }

  const effectivePermissionPreview = useMemo(() => (user?.permissions || []).slice(0, 18), [user]);

  const total = (user?.permissions || []).length;

  return (
    <PermissionGuard permissions={[permissions.usersView]}>
      <div className="space-y-6">
        <nav className="-mb-3 flex items-center gap-1.5 text-sm text-ink-3">
          <Link href="/admin/users" className="transition-colors hover:text-ink">{text.parent}</Link>
          <CaretRight size={12} aria-hidden />
          <span className="text-ink-2">{user?.fullName || text.user}</span>
        </nav>

        <PageHeader title={user?.fullName || text.user} description={user?.email} />

        {message ? (
          <div role="status" className={`rounded-lg px-3 py-2 text-sm ${message.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{message.text}</div>
        ) : null}
        {setupLink ? (
          <div className="flex flex-col gap-1.5">
            <div className="plms-label">{text.setupLink}</div>
            <code className="block break-all rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-ink-2">{setupLink}</code>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
        ) : !user ? (
          <EmptyState title={text.notFound} description={text.notFoundDescription} />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="plms-card space-y-5 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-md font-medium text-ink">{text.profile}</h2>
                <StatusBadge label={user.isActive ? text.active : text.inactive} tone={user.isActive ? "success" : "neutral"} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="user-full-name" className="plms-label">{text.fullName}</label>
                <input id="user-full-name" className="plms-input max-w-md" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
              </div>
              <label className="flex items-center gap-3 text-sm text-ink">
                <input type="checkbox" className="h-4 w-4 accent-accent" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
                {text.activeUser}
              </label>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="plms-label mb-1.5">{text.roles}</legend>
                <div className="divide-y divide-line rounded-lg border border-line">
                  {roles.map((role) => (
                    <label key={role.id} className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-raised">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-accent"
                        checked={form.roleIds.includes(role.id)}
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          roleIds: event.target.checked
                            ? [...current.roleIds, role.id]
                            : current.roleIds.filter((value) => value !== role.id),
                        }))}
                      />
                      <span className="flex flex-col">
                        <span className="text-sm text-ink">{role.name}</span>
                        <span className="text-sm text-ink-3">{role.description || text.permissionsCount.replace("{count}", String(role.permissionKeys.length))}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end border-t border-line pt-5">
                <button className="plms-button-primary" onClick={saveChanges}>{text.save}</button>
              </div>
            </section>

            <div className="space-y-6">
              <section className="plms-card space-y-4 p-5">
                <div className="space-y-1">
                  <h2 className="text-md font-medium text-ink">{text.password}</h2>
                  <p className="text-sm text-ink-3">{text.passwordHint}</p>
                </div>
                <button className="plms-button-secondary w-full" onClick={issueInviteReset}>{text.issueSetupLink}</button>
                <div className="flex items-center gap-3 text-sm text-ink-3">
                  <span className="h-px flex-1 bg-line" aria-hidden />
                  {text.or}
                  <span className="h-px flex-1 bg-line" aria-hidden />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="user-temp-password" className="plms-label">{text.temporaryPassword}</label>
                  <input id="user-temp-password" className="plms-input" type="password" value={directPassword} onChange={(event) => setDirectPassword(event.target.value)} />
                </div>
                <button className="plms-button-secondary w-full" onClick={issueTempPassword} disabled={!directPassword}>{text.setTempPassword}</button>
              </section>
              <section className="plms-card space-y-3 p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-md font-medium text-ink">{text.effective}</h2>
                  <span className="tabular font-mono text-sm text-ink-3">{total}</span>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {effectivePermissionPreview.map((permission) => (
                    <li key={permission} className="whitespace-nowrap rounded-md bg-raised px-1.5 py-0.5 font-mono text-xs text-ink-2">{permission}</li>
                  ))}
                  {total > effectivePermissionPreview.length ? <li className="px-1.5 py-0.5 text-xs text-ink-3">{text.more(total - effectivePermissionPreview.length)}</li> : null}
                </ul>
              </section>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
