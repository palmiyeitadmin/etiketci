"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { PermissionGuard } from "@/components/PermissionGuard";
import { permissions } from "@/lib/permissions";
import { PermissionCatalogGroup, RoleSummary } from "@/types/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n";

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
  const [message, setMessage] = useState<string | null>(null);

  const text = locale === "tr"
    ? {
        eyebrow: "Yonetim",
        title: "Roller",
        description: "Varsayilan ve ozel rolleri yonetin, sonra aksiyon seviyesinde yetki atayin.",
        newRole: "Yeni Rol",
        permissionsCount: "{count} yetki",
        usersCount: "{count} kullanici",
        roleName: "Rol adi",
        descriptionLabel: "Aciklama",
        immutableWarning: "Bu rol degistirilemez. Yetkiler degistirilemez.",
        saveRole: "Rolu Kaydet",
        deleteRole: "Rolu Sil",
        updated: "Rol guncellendi.",
        created: "Rol olusturuldu.",
        deleted: "Rol silindi.",
      }
    : {
        eyebrow: "Administration",
        title: "Roles",
        description: "Manage default and custom roles, then assign action-level permissions.",
        newRole: "New Role",
        permissionsCount: "{count} permissions",
        usersCount: "{count} users",
        roleName: "Role name",
        descriptionLabel: "Description",
        immutableWarning: "This role is immutable. Permissions cannot be changed.",
        saveRole: "Save Role",
        deleteRole: "Delete Role",
        updated: "Role updated.",
        created: "Role created.",
        deleted: "Role deleted.",
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
      setMessage(response.error.message);
      return;
    }

    setMessage(form.id ? text.updated : text.created);
    await load();
    setSelectedRoleId(response.data.id);
  }

  async function deleteRole() {
    if (!selectedRole) {
      return;
    }

    const response = await apiFetch(`/api/roles/${selectedRole.id}`, { method: "DELETE" });
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setMessage(text.deleted);
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

  return (
    <PermissionGuard permissions={[permissions.rolesView]}>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow={text.eyebrow}
          title={text.title}
          description={text.description}
          actions={<button className="plms-button-primary" onClick={() => { setSelectedRoleId(""); setForm(emptyRoleForm); }}>{text.newRole}</button>}
        />
        {message ? <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">{message}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              {roles.map((role) => (
                <button key={role.id} onClick={() => setSelectedRoleId(role.id)} className={`w-full rounded-[2rem] border p-5 text-left transition-colors ${selectedRoleId === role.id ? "border-blue-500/40 bg-blue-500/10" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel)]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-white">{role.name}</div>
                      <div className="mt-1 text-sm text-[color:var(--plms-text-subtle)]">{role.description || text.permissionsCount.replace("{count}", String(role.permissionKeys.length))}</div>
                    </div>
                    <div className="text-right text-xs font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.usersCount.replace("{count}", String(role.assignedUserCount))}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <input className="plms-input" placeholder={text.roleName} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={Boolean(selectedRole?.isSystem)} />
                <input className="plms-input" placeholder={text.descriptionLabel} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </div>

              {selectedRole?.isImmutable ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">{text.immutableWarning}</div>
              ) : null}

              <div className="mt-6 space-y-5">
                {catalog.map((group) => (
                  <div key={group.key} className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-white">{group.label}</div>
                    <div className="mt-4 grid gap-3">
                      {group.items.map((item) => (
                        <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-[color:var(--plms-border)] px-4 py-3 text-sm text-white">
                          <input type="checkbox" checked={form.permissionKeys.includes(item.key)} onChange={() => togglePermission(item.key)} disabled={Boolean(selectedRole?.isImmutable)} />
                          <span>
                            <span className="block font-bold">{item.label}</span>
                            <span className="block text-xs text-[color:var(--plms-text-subtle)]">{item.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button className="plms-button-primary" onClick={saveRole} disabled={selectedRole?.isImmutable}>{text.saveRole}</button>
                {selectedRole && !selectedRole.isSystem ? <button className="rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={deleteRole}>{text.deleteRole}</button> : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
