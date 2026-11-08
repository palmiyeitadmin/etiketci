"use client";

import { useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/PermissionGuard";
import { apiFetch } from "@/lib/api-client";
import { buildAssetContentUrl, deleteAsset, listAssets, uploadAsset } from "@/lib/assets";
import { useText } from "@/lib/i18n";
import { permissions } from "@/lib/permissions";
import { ContentAssetSummary } from "@/types/assets";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "next-auth/react";
import { ArrowClockwise, Trash, UploadSimple } from "@phosphor-icons/react";
import { useLatest } from "@/lib/useLatest";

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
  const [messageTone, setMessageTone] = useState<"good" | "bad">("good");
  const text = useText("catalog").contentLibrary;

  async function load(search = query) {
    setLoading(true);
    const response = await listAssets(search);
    if (response.success) {
      setAssets(response.data);
    }
    setLoading(false);
  }

  const loadRef = useLatest(load);
  useEffect(() => {
    void loadRef.current("");
  }, [loadRef]);

  const filtered = useMemo(() => assets, [assets]);

  function showMessage(value: string, tone: "good" | "bad") {
    setMessage(value);
    setMessageTone(tone);
  }

  return (
    <PermissionGuard permissions={[permissions.assetsView]}>
      <div className="space-y-6">
        <PageHeader
          title={text.title}
          description={text.description}
          actions={canUpload ? (
            <label title={text.uploadHint} className={`plms-button-primary focus-within:ring-2 focus-within:ring-accent/30 ${uploading ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
              {uploading ? (
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-accent-ink/40 border-t-accent-ink" />
              ) : (
                <UploadSimple size={16} aria-hidden />
              )}
              {uploading ? text.uploading : text.uploadAsset}
              <input
                type="file"
                className="sr-only"
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
                      showMessage(response.data.deduplicated ? text.reused : text.uploaded, "good");
                      await load();
                    } else {
                      showMessage(response.error.message, "bad");
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
          left={
            <form className="flex w-full max-w-sm" onSubmit={(event) => { event.preventDefault(); void load(); }}>
              <input className="plms-input" placeholder={text.search} value={query} onChange={(event) => setQuery(event.target.value)} />
            </form>
          }
          right={
            <>
              {!loading ? <span className="tabular text-sm text-ink-3">{text.count(filtered.length)}</span> : null}
              <button className="plms-button-ghost" onClick={() => void load()}>
                <ArrowClockwise size={16} aria-hidden />
                {text.refresh}
              </button>
            </>
          }
        />

        {message ? (
          <div role="status" className={`rounded-lg px-3 py-2 text-sm ${messageTone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{message}</div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title={text.emptyTitle} description={`${text.emptyDescription} ${canUpload ? text.uploadHint : ""}`.trim()} />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filtered.map((asset) => (
              <li key={asset.id} className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
                <div className="flex aspect-square items-center justify-center border-b border-line bg-canvas p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded asset served by the authenticated proxy; next/image would fetch it without the session */}
                  <img src={buildAssetContentUrl(asset.id)} alt={asset.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex items-start gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink" title={asset.name}>{asset.name}</div>
                    <div className="tabular truncate font-mono text-xs text-ink-3" title={asset.fileName}>
                      {asset.mimeType.replace("image/", "").replace("+xml", "")} · {Math.round(asset.byteSize / 1024)} KB
                    </div>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      aria-label={`${text.delete}: ${asset.name}`}
                      title={text.delete}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bad-soft hover:text-bad"
                      onClick={async () => {
                        const response = await deleteAsset(asset.id);
                        if (response.success) {
                          showMessage(text.removed, "good");
                          await load();
                        }
                      }}
                    >
                      <Trash size={16} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PermissionGuard>
  );
}
