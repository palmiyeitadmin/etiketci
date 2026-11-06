"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { PermissionGuard } from "@/components/PermissionGuard";
import { permissions } from "@/lib/permissions";
import { RoleSummary, UserSummary } from "@/types/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SlideOver } from "@/components/ui/SlideOver";
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
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [setupLink, setSetupLink] = useState<string | null>(null);

  const text = locale === "tr"
    ? {
        title: "Kullanıcılar",
        description: "Kullanıcı ekleyin, rollerini ve hesap durumlarını yönetin.",
        newUser: "Yeni kullanıcı",
        newUserSubtitle: "Davet bağlantısı gönderin veya geçici parola belirleyin",
        email: "E-posta",
        fullName: "Ad soyad",
        mode: "Parola",
        inviteMode: "Kullanıcı kendi parolasını belirlesin",
        directMode: "Geçici parola belirle",
        temporaryPassword: "Geçici parola",
        mustChangePassword: "İlk girişte parola değiştirilsin",
        roles: "Roller",
        permissionsCount: "{count} yetki",
        creating: "Oluşturuluyor",
        createUser: "Kullanıcıyı oluştur",
        userCreated: "Kullanıcı oluşturuldu",
        setupLink: "Kurulum bağlantısı",
        searchUsers: "Ara",
        status: "Durum",
        allStatuses: "Tüm durumlar",
        active: "Aktif",
        inactive: "Pasif",
        allRoles: "Tüm roller",
        emptyTitle: "Kullanıcı bulunamadı",
        emptyDescription: "Filtrelerle eşleşen kullanıcı yok.",
        mustChangePasswordBadge: "Parola değiştirmeli",
        noRoles: "Rol yok",
        open: "Aç",
        count: (n: number) => `${n} kullanıcı`,
      }
    : {
        title: "Users",
        description: "Add users and manage their roles and account status.",
        newUser: "New user",
        newUserSubtitle: "Send an invite link or set a temporary password",
        email: "Email",
        fullName: "Full name",
        mode: "Password",
        inviteMode: "User sets their own password",
        directMode: "Set a temporary password",
        temporaryPassword: "Temporary password",
        mustChangePassword: "Must change password on first sign-in",
        roles: "Roles",
        permissionsCount: "{count} permissions",
        creating: "Creating",
        createUser: "Create user",
        userCreated: "User created",
        setupLink: "Setup link",
        searchUsers: "Search",
        status: "Status",
        allStatuses: "All statuses",
        active: "Active",
        inactive: "Inactive",
        allRoles: "All roles",
        emptyTitle: "No users found",
        emptyDescription: "No users match the filters.",
        mustChangePasswordBadge: "Must change password",
        noRoles: "No roles",
        open: "Open",
        count: (n: number) => `${n} ${n === 1 ? "user" : "users"}`,
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
      setMessage({ tone: "bad", text: response.error.message });
      return;
    }

    setMessage({ tone: "good", text: text.userCreated });
    setSetupLink(response.data.setupLink || null);
    setForm(initialForm);
    await load();
  }

  const openCreate = () => {
    setMessage(null);
    setSetupLink(null);
    setCreateOpen(true);
  };

  return (
    <PermissionGuard permissions={[permissions.usersView]}>
      <div className="space-y-6">
        <PageHeader
          title={text.title}
          description={text.description}
          actions={<button className="plms-button-primary" onClick={openCreate}>{text.newUser}</button>}
        />

        <FilterBar
          left={
            <>
              <input className="plms-input max-w-sm" placeholder={text.searchUsers} value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="plms-select" aria-label={text.status} value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
                <option value="all">{text.allStatuses}</option>
                <option value="active">{text.active}</option>
                <option value="inactive">{text.inactive}</option>
              </select>
              <select className="plms-select" aria-label={text.roles} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">{text.allRoles}</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </>
          }
          right={!loading ? <span className="tabular text-sm text-ink-3">{text.count(filteredUsers.length)}</span> : null}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
        ) : (
          <DataTable columns={[text.fullName, text.email, text.roles, text.status, ""]}>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-raised">
                <td className="whitespace-nowrap px-4 py-2.5 text-base">
                  <Link href={`/admin/users/${user.id}`} className="text-ink transition-colors hover:text-accent">{user.fullName}</Link>
                </td>
                <td className="px-4 py-2.5 text-base text-ink-2">{user.email}</td>
                <td className="px-4 py-2.5 text-base text-ink-2">{user.roles.length > 0 ? user.roles.map((role) => role.name).join(", ") : <span className="text-ink-3">{text.noRoles}</span>}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusBadge label={user.isActive ? text.active : text.inactive} tone={user.isActive ? "success" : "neutral"} />
                    {user.mustChangePassword ? <span className="whitespace-nowrap text-sm text-warn">{text.mustChangePasswordBadge}</span> : null}
                  </div>
                </td>
                <td className="px-4 py-1.5 text-right">
                  <Link href={`/admin/users/${user.id}`} className="plms-button-compact">{text.open}</Link>
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        <SlideOver open={createOpen} title={text.newUser} subtitle={text.newUserSubtitle} onClose={() => setCreateOpen(false)}>
          <form className="space-y-5" onSubmit={handleCreate}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-user-email" className="plms-label">{text.email}</label>
              <input id="new-user-email" type="email" className="plms-input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-user-name" className="plms-label">{text.fullName}</label>
              <input id="new-user-name" className="plms-input" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-user-mode" className="plms-label">{text.mode}</label>
              <select id="new-user-mode" className="plms-select w-full" value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value, password: "" }))}>
                <option value="invite">{text.inviteMode}</option>
                <option value="direct">{text.directMode}</option>
              </select>
            </div>
            {form.mode === "direct" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-user-password" className="plms-label">{text.temporaryPassword}</label>
                <input id="new-user-password" className="plms-input" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
              </div>
            ) : null}
            <label className="flex items-center gap-3 text-sm text-ink">
              <input type="checkbox" className="h-4 w-4 accent-accent" checked={form.mustChangePassword} onChange={(event) => setForm((current) => ({ ...current, mustChangePassword: event.target.checked }))} />
              {text.mustChangePassword}
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
            {message ? (
              <div role="status" className={`rounded-lg px-3 py-2 text-sm ${message.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{message.text}</div>
            ) : null}
            {setupLink ? (
              <div className="flex flex-col gap-1.5">
                <div className="plms-label">{text.setupLink}</div>
                <code className="block break-all rounded-md bg-raised px-2.5 py-1.5 font-mono text-xs text-ink-2">{setupLink}</code>
              </div>
            ) : null}
            <button className="plms-button-primary w-full" type="submit" disabled={busy}>{busy ? text.creating : text.createUser}</button>
          </form>
        </SlideOver>
      </div>
    </PermissionGuard>
  );
}
