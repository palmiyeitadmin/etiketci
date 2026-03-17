"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadAsset, listAssets, deleteAsset, buildAssetContentUrl, fetchAssetAsDataUri } from "@/lib/assets";
import { phosphorIconToDataUri, type PhosphorIconKey } from "@/lib/phosphor-icon-catalog";
import { hasPermission, permissions } from "@/lib/permissions";
import { ContentAssetSummary } from "@/types/assets";
import { PhosphorIconPicker } from "@/components/Editor/PhosphorIconPicker";
import { useSession } from "next-auth/react";

export function AssetLibraryDrawer({
  open,
  onClose,
  onInsertImage,
}: {
  open: boolean;
  onClose: () => void;
  onInsertImage: (payload: { name: string; content: string; assetId?: string; assetSource?: "upload" | "phosphor"; assetKey?: string }) => void;
}) {
  const { data: session } = useSession();
  const userPermissions = ((session?.user as any)?.permissions || []) as string[];
  const canUpload = hasPermission(userPermissions, permissions.assetsUpload) || (session?.user as any)?.roles?.includes?.("Admin");
  const canDelete = hasPermission(userPermissions, permissions.assetsDelete) || (session?.user as any)?.roles?.includes?.("Admin");
  const [tab, setTab] = useState<"uploads" | "phosphor">("uploads");
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<ContentAssetSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [insertingAssetId, setInsertingAssetId] = useState<string | null>(null);

  async function loadAssets(search = query) {
    setLoading(true);
    const response = await listAssets(search);
    if (response.success) {
      setAssets(response.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    void loadAssets("");
  }, [open]);

  const emptyText = useMemo(() => loading ? "Loading library..." : "No shared assets found.", [loading]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] bg-slate-950/75 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] shadow-[0_24px_80px_rgba(2,6,23,0.5)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[color:var(--plms-border)] px-6 py-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Shared Content Library</div>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">Assets and icons</h2>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--plms-text-subtle)]">Reuse uploaded visuals and curated Phosphor icons without re-uploading the same file into every template.</p>
          </div>
          <button className="plms-button-secondary" onClick={onClose}>Close</button>
        </div>

        <div className="flex items-center gap-2 border-b border-[color:var(--plms-border)] px-6 py-4">
          <button className={`plms-button-compact ${tab === "uploads" ? "border-blue-400/30 bg-blue-500/10 text-white" : ""}`} onClick={() => setTab("uploads")}>Uploads</button>
          <button className={`plms-button-compact ${tab === "phosphor" ? "border-blue-400/30 bg-blue-500/10 text-white" : ""}`} onClick={() => setTab("phosphor")}>Phosphor</button>
          {tab === "uploads" ? (
            <div className="ml-auto flex items-center gap-2">
              <input className="plms-input w-72" placeholder="Search assets" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button className="plms-button-compact" onClick={() => void loadAssets()}>Refresh</button>
            </div>
          ) : null}
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {message ? <div className="mb-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">{message}</div> : null}
          {uploading ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-blue-400/20 bg-[linear-gradient(180deg,rgba(37,99,235,0.14),rgba(14,165,233,0.08))] px-4 py-3 text-sm text-blue-100">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300/30 border-t-blue-200" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Uploading</div>
                <div className="mt-1 text-sm text-blue-50">Adding asset to shared library and checking for duplicates.</div>
              </div>
            </div>
          ) : null}

          {tab === "uploads" ? (
            <div className="space-y-5">
              {canUpload ? (
                <label className={`flex items-center justify-center rounded-2xl border border-dashed border-[color:var(--plms-border-strong)] bg-white/[0.02] px-4 py-5 text-center text-sm text-[color:var(--plms-text-subtle)] transition-colors hover:bg-white/[0.04] ${uploading ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
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
                          setMessage(response.data.deduplicated ? "Existing shared asset reused." : "Asset uploaded to shared library.");
                          await loadAssets();
                        } else {
                          setMessage(response.error.message);
                        }
                      } finally {
                        setUploading(false);
                        event.target.value = "";
                      }
                    }}
                  />
                  <div>
                    <div>Upload PNG, JPEG or SVG into the shared library</div>
                    <div className="mt-1 text-[11px] text-[color:var(--plms-text-subtle)]/80">Up to 5 MB per asset</div>
                  </div>
                </label>
              ) : null}

              {assets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-12 text-center text-sm text-[color:var(--plms-text-subtle)]">{emptyText}</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {assets.map((asset) => (
                    <article key={asset.id} className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--plms-border)] bg-white/[0.03]">
                        <img src={buildAssetContentUrl(asset.id)} alt={asset.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="mt-3 truncate text-sm font-bold text-white">{asset.name}</div>
                      <div className="mt-1 truncate text-[11px] text-[color:var(--plms-text-subtle)]">{asset.fileName}</div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{formatBytes(asset.byteSize)}</div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="plms-button-compact disabled:cursor-wait disabled:opacity-60"
                          disabled={uploading || insertingAssetId === asset.id}
                          onClick={async () => {
                            try {
                              setInsertingAssetId(asset.id);
                              const content = await fetchAssetAsDataUri(asset.id);
                              onInsertImage({ name: asset.name, content, assetId: asset.id, assetSource: "upload" });
                            } catch (error) {
                              setMessage(error instanceof Error ? error.message : "Asset could not be inserted.");
                            } finally {
                              setInsertingAssetId(null);
                            }
                          }}
                        >
                          {insertingAssetId === asset.id ? "Adding" : "Add"}
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            className="inline-flex min-w-0 items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white"
                            onClick={async () => {
                              const response = await deleteAsset(asset.id);
                              if (response.success) {
                                setMessage("Asset removed from shared library.");
                                await loadAssets();
                              } else {
                                setMessage(response.error.message);
                              }
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <PhosphorIconPicker
              onInsert={({ key, name }) => {
                const content = phosphorIconToDataUri(key as PhosphorIconKey);
                onInsertImage({ name, content, assetSource: "phosphor", assetKey: key });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
