"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { PermissionGuard } from "@/components/PermissionGuard";
import { permissions } from "@/lib/permissions";
import { PermissionCatalogGroup, RoleSummary } from "@/types/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n";
import { LockSimple } from "@phosphor-icons/react";

const emptyRoleForm = {
  id: "",
  name: "",
  description: "",
  permissionKeys: [] as string[],
};

export default function RolesPage() {
  const { locale } = useI18n();
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogGroup[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [form, setForm] = useState(emptyRoleForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const text = locale === "tr"
    ? {
        title: "Roller",
        description: "Rolleri ve her rolün hangi işlemleri yapabileceğini yönetin.",
        newRole: "Yeni rol",
        newRoleTitle: "Yeni rol",
        permissionsCount: "{count} yetki",
        usersCount: "{count} kullanıcı",
        roleName: "Rol adı",
        descriptionLabel: "Açıklama",
        immutableWarning: "Bu bir sistem rolü, yetkileri değiştirilemez.",
        saveRole: "Rolü kaydet",
        deleteRole: "Rolü sil",
        updated: "Rol güncellendi",
        created: "Rol oluşturuldu",
        deleted: "Rol silindi",
        permissionsTitle: "Yetkiler",
        system: "Sistem",
      }
    : {
        title: "Roles",
        description: "Manage roles and which actions each role can take.",
        newRole: "New role",
        newRoleTitle: "New role",
        permissionsCount: "{count} permissions",
        usersCount: "{count} users",
        roleName: "Role name",
        descriptionLabel: "Description",
        immutableWarning: "This is a system role, its permissions cannot be changed.",
        saveRole: "Save role",
        deleteRole: "Delete role",
        updated: "Role updated",
        created: "Role created",
        deleted: "Role deleted",
        permissionsTitle: "Permissions",
        system: "System",
      };

  async function load() {
    setLoading(true);
    const [rolesResponse, catalogResponse] = await Promise.all([
      apiFetch<RoleSummary[]>("/api/roles"),
      apiFetch<PermissionCatalogGroup[]>("/api/permissions/catalog"),
    ]);

    if (rolesResponse.success) {
      setRoles(rolesResponse.data);
      if (!selectedRoleId && rolesResponse.data.length > 0) {
        const first = rolesResponse.data[0];
        setSelectedRoleId(first.id);
        setForm({ id: first.id, name: first.name, description: first.description || "", permissionKeys: first.permissionKeys });
      }
    }

    if (catalogResponse.success) {
      setCatalog(catalogResponse.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const selected = roles.find((role) => role.id === selectedRoleId);
    if (selected) {
      setForm({ id: selected.id, name: selected.name, description: selected.description || "", permissionKeys: selected.permissionKeys });
    }
  }, [roles, selectedRoleId]);

  const selectedRole = useMemo(() => roles.find((role) => role.id === selectedRoleId) || null, [roles, selectedRoleId]);

  async function saveRole() {
    const payload = {
      name: form.name,
      description: form.description,
      permissionKeys: form.permissionKeys,
    };

    const endpoint = form.id ? `/api/roles/${form.id}` : "/api/roles";
    const method = form.id ? "PUT" : "POST";
    const response = await apiFetch<RoleSummary>(endpoint, { method, body: JSON.stringify(payload) });

    if (!response.success) {
      setMessage({ tone: "bad", text: response.error.message });
      return;
    }

    setMessage({ tone: "good", text: form.id ? text.updated : text.created });
    await load();
    setSelectedRoleId(response.data.id);
  }

  async function deleteRole() {
    if (!selectedRole) {
      return;
    }

    const response = await apiFetch(`/api/roles/${selectedRole.id}`, { method: "DELETE" });
    if (!response.success) {
      setMessage({ tone: "bad", text: response.error.message });
      return;
    }

    setMessage({ tone: "good", text: text.deleted });
    setSelectedRoleId("");
    setForm(emptyRoleForm);
    await load();
  }

  function togglePermission(permissionKey: string) {
    setForm((current) => ({
      ...current,
      permissionKeys: current.permissionKeys.includes(permissionKey)
        ? current.permissionKeys.filter((value) => value !== permissionKey)
        : [...current.permissionKeys, permissionKey],
    }));
  }

  const locked = Boolean(selectedRole?.isImmutable);

  return (
    <PermissionGuard permissions={[permissions.rolesView]}>
      <div className="space-y-6">
        <PageHeader
          title={text.title}
          description={text.description}
          actions={<button className="plms-button-secondary" onClick={() => { setSelectedRoleId(""); setForm(emptyRoleForm); }}>{text.newRole}</button>}
        />
        {message ? (
          <div role="status" className={`rounded-lg px-3 py-2 text-sm ${message.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{message.text}</div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <nav aria-label={text.title} className="plms-card flex flex-col gap-0.5 p-1.5">
              {roles.map((role) => {
                const active = selectedRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${active ? "bg-raised" : "hover:bg-raised"}`}
                  >
                    <span className="min-w-0">
                      <span className={`block truncate text-base ${active ? "font-medium text-ink" : "text-ink-2"}`}>{role.name}</span>
                      <span className="block truncate text-sm text-ink-3">{text.permissionsCount.replace("{count}", String(role.permissionKeys.length))}</span>
                    </span>
                    <span className="tabular shrink-0 font-mono text-xs text-ink-3" title={text.usersCount.replace("{count}", String(role.assignedUserCount))}>
                      {role.assignedUserCount}
                    </span>
                  </button>
                );
              })}
              {!selectedRoleId ? (
                <div className="flex items-center rounded-lg bg-raised px-3 py-2 text-base font-medium text-ink">{text.newRoleTitle}</div>
              ) : null}
            </nav>

            <section className="plms-card divide-y divide-line">
              <div className="space-y-4 p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-md font-medium text-ink">{selectedRole ? selectedRole.name : text.newRoleTitle}</h2>
                  {selectedRole ? (
                    <span className="text-sm text-ink-3">
                      {selectedRole.isSystem ? `${text.system} · ` : ""}{text.usersCount.replace("{count}", String(selectedRole.assignedUserCount))}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="role-name" className="plms-label">{text.roleName}</label>
                    <input id="role-name" className="plms-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={Boolean(selectedRole?.isSystem)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="role-description" className="plms-label">{text.descriptionLabel}</label>
                    <input id="role-description" className="plms-input" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                </div>
                {locked ? (
                  <div className="flex items-center gap-2 rounded-lg bg-raised px-3 py-2 text-sm text-ink-2">
                    <LockSimple size={16} aria-hidden className="text-ink-3" />
                    {text.immutableWarning}
                  </div>
                ) : null}
              </div>

              <div className="space-y-5 p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-base font-medium text-ink">{text.permissionsTitle}</h3>
                  <span className="tabular font-mono text-sm text-ink-3">
                    {form.permissionKeys.length} / {catalog.reduce((sum, group) => sum + group.items.length, 0)}
                  </span>
                </div>
                <div className="grid gap-x-8 gap-y-6 xl:grid-cols-2">
                  {catalog.map((group) => {
                    const selectedCount = group.items.filter((item) => form.permissionKeys.includes(item.key)).length;
                    return (
                      <fieldset key={group.key} className="min-w-0">
                        <legend className="flex w-full items-baseline justify-between gap-3 border-b border-line pb-2">
                          <span className="text-sm font-medium text-ink">{group.label}</span>
                          <span className="tabular font-mono text-xs text-ink-3">{selectedCount}/{group.items.length}</span>
                        </legend>
                        <div className="mt-1 flex flex-col">
                          {group.items.map((item) => (
                            <label key={item.key} className={`flex items-start gap-3 rounded-md px-2 py-2 transition-colors ${locked ? "" : "cursor-pointer hover:bg-raised"}`}>
                              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-accent" checked={form.permissionKeys.includes(item.key)} onChange={() => togglePermission(item.key)} disabled={locked} />
                              <span className="min-w-0">
                                <span className="block text-sm text-ink">{item.label}</span>
                                {item.description ? <span className="block text-sm text-ink-3">{item.description}</span> : null}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4">
                {selectedRole && !selectedRole.isSystem ? <button className="plms-button-danger mr-auto" onClick={deleteRole}>{text.deleteRole}</button> : null}
                <button className="plms-button-primary" onClick={saveRole} disabled={locked}>{text.saveRole}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
