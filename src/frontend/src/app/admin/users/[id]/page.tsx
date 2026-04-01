"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { PermissionGuard } from "@/components/PermissionGuard";
import { permissions } from "@/lib/permissions";
import { RoleSummary, UserSummary } from "@/types/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveChanges() {
    const response = await apiFetch<UserSummary>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });

    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setMessage("User updated.");
    setUser(response.data);
  }

  async function issueInviteReset() {
    const response = await apiFetch<{ setupLink: string }>(`/api/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ mode: "invite-reset" }),
    });

    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setSetupLink(response.data.setupLink);
    setMessage("Setup link re-issued.");
  }

  async function issueTempPassword() {
    const response = await apiFetch(`/api/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ mode: "admin-set-temp-password", password: directPassword }),
    });

    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setDirectPassword("");
    setMessage("Temporary password issued.");
    setSetupLink(null);
    await load();
  }

  const effectivePermissionPreview = useMemo(() => (user?.permissions || []).slice(0, 18), [user]);

  return (
    <PermissionGuard permissions={[permissions.usersView]}>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader eyebrow="Administration" title={user?.fullName || "User"} description={user?.email || "Manage user roles, activation and password onboarding."} />
        {message ? <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">{message}</div> : null}
        {setupLink ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100 break-all">Setup link: {setupLink}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
        ) : !user ? (
          <EmptyState title="User not found" description="The requested user record could not be loaded." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <input className="plms-input md:col-span-2" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
                <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
                  Active user
                </label>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Role assignments</div>
                {roles.map((role) => (
                  <label key={role.id} className="flex items-start gap-3 rounded-2xl border border-[color:var(--plms-border)] px-4 py-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={form.roleIds.includes(role.id)}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        roleIds: event.target.checked
                          ? [...current.roleIds, role.id]
                          : current.roleIds.filter((value) => value !== role.id),
                      }))}
                    />
                    <span>
                      <span className="block font-bold">{role.name}</span>
                      <span className="block text-xs text-[color:var(--plms-text-subtle)]">{role.description || `${role.permissionKeys.length} permissions`}</span>
                    </span>
                  </label>
                ))}
              </div>
              <button className="plms-button-primary" onClick={saveChanges}>Save Changes</button>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Password actions</div>
                <div className="mt-4 flex flex-col gap-3">
                  <button className="plms-button-secondary" onClick={issueInviteReset}>Issue setup link</button>
                  <input className="plms-input" type="password" placeholder="Temporary password" value={directPassword} onChange={(event) => setDirectPassword(event.target.value)} />
                  <button className="plms-button-secondary" onClick={issueTempPassword} disabled={!directPassword}>Set temp password</button>
                </div>
              </div>
              <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Effective permissions</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {effectivePermissionPreview.map((permission) => <span key={permission} className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-xs font-black text-blue-200">{permission}</span>)}
                  {(user.permissions || []).length > effectivePermissionPreview.length ? <span className="rounded-xl border border-[color:var(--plms-border)] px-2 py-1 text-xs font-black text-[color:var(--plms-text-subtle)]">+{(user.permissions || []).length - effectivePermissionPreview.length} more</span> : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
