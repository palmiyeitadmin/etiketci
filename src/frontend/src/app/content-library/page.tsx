"use client";

import { useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/PermissionGuard";
import { apiFetch } from "@/lib/api-client";
import { buildAssetContentUrl, deleteAsset, listAssets, uploadAsset } from "@/lib/assets";
import { permissions } from "@/lib/permissions";
import { ContentAssetSummary } from "@/types/assets";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "next-auth/react";

export default function ContentLibraryPage() {
  const { data: session } = useSession();
  const userPermissions = ((session?.user as any)?.permissions || []) as string[];
  const canUpload = userPermissions.includes(permissions.assetsUpload) || ((session?.user as any)?.roles || []).includes("Admin");
  const canDelete = userPermissions.includes(permissions.assetsDelete) || ((session?.user as any)?.roles || []).includes("Admin");
  const [assets, setAssets] = useState<ContentAssetSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load(search = query) {
    setLoading(true);
    const response = await listAssets(search);
    if (response.success) {
      setAssets(response.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load("");
  }, []);

  const filtered = useMemo(() => assets, [assets]);

  return (
    <PermissionGuard permissions={[permissions.assetsView]}>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Shared content"
          title="Content Library"
          description="Deduplicated uploaded visuals for reuse across governed templates."
          actions={canUpload ? (
            <label className={`plms-button-primary ${uploading ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
              {uploading ? "Uploading..." : "Upload Asset"}
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/svg+xml"
                disabled={uploading}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setMessage(null);
                  try {
                    const response = await uploadAsset(file);
                    if (response.success) {
                      setMessage(response.data.deduplicated ? "Existing shared asset reused." : "Asset uploaded.");
                      await load();
                    } else {
                      setMessage(response.error.message);
                    }
                  } finally {
                    setUploading(false);
                    event.target.value = "";
                  }
                }}
              />
            </label>
          ) : null}
        />

        <FilterBar
          left={<input className="plms-input max-w-xl" placeholder="Search asset name or filename" value={query} onChange={(event) => setQuery(event.target.value)} />}
          right={<button className="plms-button-secondary" onClick={() => void load()}>Refresh</button>}
        />

        {message ? <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">{message}</div> : null}
        {uploading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-400/20 bg-[linear-gradient(180deg,rgba(37,99,235,0.14),rgba(14,165,233,0.08))] px-4 py-3 text-sm text-blue-100">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300/30 border-t-blue-200" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Uploading</div>
              <div className="mt-1 text-sm text-blue-50">Shared library is processing your asset. Maximum size is 5 MB.</div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No shared assets" description="Upload reusable visuals once and insert them into any template from the library." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((asset) => (
              <article key={asset.id} className="rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-4">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.03]">
                  <img src={buildAssetContentUrl(asset.id)} alt={asset.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="mt-4 truncate text-sm font-bold text-white">{asset.name}</div>
                <div className="mt-1 truncate text-xs text-[color:var(--plms-text-subtle)]">{asset.fileName}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">
                  <span>{Math.round(asset.byteSize / 1024)} KB</span>
                  <span>{asset.mimeType.replace("image/", "")}</span>
                </div>
                {canDelete ? <button className="mt-4 w-full rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white" onClick={async () => { const response = await deleteAsset(asset.id); if (response.success) { setMessage("Asset removed."); await load(); } }}>Delete</button> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
