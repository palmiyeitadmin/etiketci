"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { PermissionGuard } from "@/components/PermissionGuard";
import { permissions } from "@/lib/permissions";
import { RoleSummary, UserSummary } from "@/types/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/lib/i18n";

const initialForm = {
  email: "",
  fullName: "",
  mode: "invite",
  password: "",
  mustChangePassword: true,
  roleIds: [] as string[],
};

export default function AdminUsersPage() {
  const { locale } = useI18n();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [setupLink, setSetupLink] = useState<string | null>(null);

  const text = locale === "tr"
    ? {
        eyebrow: "Yonetim",
        title: "Kullanicilar",
        description: "Kullanicilar olusturun, rol atamalarini yonetin ve onboarding yapisini kontrol edin.",
        close: "Kapat",
        newUser: "Yeni Kullanici",
        email: "E-posta",
        fullName: "Ad soyad",
        inviteMode: "Davet et ve sifre belirlet",
        directMode: "Yonetici gecici sifre belirlesin",
        temporaryPassword: "Gecici sifre",
        mustChangePassword: "Ilk giriste sifre degistirilsin",
        roles: "Roller",
        permissionsCount: "{count} yetki",
        creating: "Olusturuluyor...",
        createUser: "Kullanici Olustur",
        userCreated: "Kullanici olusturuldu.",
        setupLink: "Kurulum baglantisi",
        searchUsers: "Kullanicilarda ara",
        allStatuses: "Tum durumlar",
        active: "Aktif",
        inactive: "Pasif",
        allRoles: "Tum roller",
        emptyTitle: "Kullanici bulunamadi",
        emptyDescription: "Mevcut filtrelerle eslesen kullanici yok.",
        mustChangePasswordBadge: "Sifre degistirmeli",
        open: "Ac",
      }
    : {
        eyebrow: "Administration",
        title: "Users",
        description: "Create users, manage role assignments and control onboarding posture.",
        close: "Close",
        newUser: "New User",
        email: "Email",
        fullName: "Full name",
        inviteMode: "Invite + set password",
        directMode: "Admin sets temp password",
        temporaryPassword: "Temporary password",
        mustChangePassword: "Must change password on first sign-in",
        roles: "Roles",
        permissionsCount: "{count} permissions",
        creating: "Creating...",
        createUser: "Create User",
        userCreated: "User created.",
        setupLink: "Setup link",
        searchUsers: "Search users",
        allStatuses: "All statuses",
        active: "Active",
        inactive: "Inactive",
        allRoles: "All roles",
        emptyTitle: "No users found",
        emptyDescription: "No users match the current filters.",
        mustChangePasswordBadge: "Must change password",
        open: "Open",
      };

  async function load() {
    setLoading(true);
    const [userResponse, roleResponse] = await Promise.all([
      apiFetch<UserSummary[]>("/api/users"),
      apiFetch<RoleSummary[]>("/api/roles"),
    ]);

    if (userResponse.success) {
      setUsers(userResponse.data);
    }

    if (roleResponse.success) {
      setRoles(roleResponse.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = !search || user.email.toLowerCase().includes(search.toLowerCase()) || user.fullName.toLowerCase().includes(search.toLowerCase());
      const matchesActive = activeFilter === "all" || (activeFilter === "active" ? user.isActive : !user.isActive);
      const matchesRole = roleFilter === "all" || user.roles.some((role) => role.id === roleFilter);
      return matchesSearch && matchesActive && matchesRole;
    });
  }, [activeFilter, roleFilter, search, users]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setSetupLink(null);

    const response = await apiFetch<{ id: string; setupLink?: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify({
        email: form.email,
        fullName: form.fullName,
        mode: form.mode,
        password: form.mode === "direct" ? form.password : undefined,
        mustChangePassword: form.mustChangePassword,
        roleIds: form.roleIds,
      }),
    });

    setBusy(false);

    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setMessage(text.userCreated);
    setSetupLink(response.data.setupLink || null);
    setForm(initialForm);
    await load();
  }

  return (
    <PermissionGuard permissions={[permissions.usersView]}>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow={text.eyebrow}
          title={text.title}
          description={text.description}
          actions={<button className="plms-button-primary" onClick={() => setCreateOpen((value) => !value)}>{createOpen ? text.close : text.newUser}</button>}
        />

        {createOpen ? (
          <form className="grid gap-4 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6 lg:grid-cols-2" onSubmit={handleCreate}>
            <div className="space-y-4">
              <input className="plms-input" placeholder={text.email} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
              <input className="plms-input" placeholder={text.fullName} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required />
              <select className="plms-input" value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value, password: "" }))}>
                <option value="invite">{text.inviteMode}</option>
                <option value="direct">{text.directMode}</option>
              </select>
              {form.mode === "direct" ? (
                <input className="plms-input" type="password" placeholder={text.temporaryPassword} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
              ) : null}
              <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                <input type="checkbox" checked={form.mustChangePassword} onChange={(event) => setForm((current) => ({ ...current, mustChangePassword: event.target.checked }))} />
                {text.mustChangePassword}
              </label>
            </div>
            <div className="space-y-3 rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.roles}</div>
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
                    <span className="block text-xs text-[color:var(--plms-text-subtle)]">{role.description || text.permissionsCount.replace("{count}", String(role.permissionKeys.length))}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
              <button className="plms-button-primary" type="submit" disabled={busy}>{busy ? text.creating : text.createUser}</button>
              {message ? <div className="text-sm font-medium text-[color:var(--plms-text-muted)]">{message}</div> : null}
              {setupLink ? <div className="w-full rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100 break-all">{text.setupLink}: {setupLink}</div> : null}
            </div>
          </form>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_180px_240px]">
          <input className="plms-input" placeholder={text.searchUsers} value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="plms-input" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
            <option value="all">{text.allStatuses}</option>
            <option value="active">{text.active}</option>
            <option value="inactive">{text.inactive}</option>
          </select>
          <select className="plms-input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">{text.allRoles}</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
        ) : (
          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="text-xl font-black tracking-[-0.04em] text-white">{user.fullName}</div>
                    <div className="text-sm font-medium text-[color:var(--plms-text-subtle)]">{user.email}</div>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => <span key={role.id} className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-xs font-black text-blue-200">{role.name}</span>)}
                      <span className={`rounded-xl px-2 py-1 text-xs font-black ${user.isActive ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>{user.isActive ? text.active : text.inactive}</span>
                      {user.mustChangePassword ? <span className="rounded-xl bg-amber-500/10 px-2 py-1 text-xs font-black text-amber-200">{text.mustChangePasswordBadge}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/admin/users/${user.id}`} className="plms-button-secondary">{text.open}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
