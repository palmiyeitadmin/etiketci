"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadAsset, listAssets, deleteAsset, buildAssetContentUrl } from "@/lib/assets";
import { useText } from "@/lib/i18n";
import { phosphorIconToDataUri, type PhosphorIconKey } from "@/lib/phosphor-icon-catalog";
import { hasPermission, permissions } from "@/lib/permissions";
import { ContentAssetSummary } from "@/types/assets";
import { PhosphorIconPicker } from "@/components/Editor/PhosphorIconPicker";
import { PickerErrorBoundary } from "@/components/Editor/PickerErrorBoundary";
import { useSession } from "next-auth/react";
import { ArrowClockwise, CircleNotch, MagnifyingGlass, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { SlideOver } from "@/components/ui/SlideOver";
import { useLatest } from "@/lib/useLatest";

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
  const text = useText("editor").assetLibrary;
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

  const loadAssetsRef = useLatest(loadAssets);
  useEffect(() => {
    if (!open) return;
    void loadAssetsRef.current("");
  }, [open, loadAssetsRef]);

  const emptyText = useMemo(() => loading ? text.loading : text.empty, [loading, text.empty, text.loading]);

  return (
    <SlideOver open={open} title={text.title} subtitle={text.description} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-raised p-0.5" role="tablist">
            {(["uploads", "phosphor"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                className={`h-7 rounded-md px-3 text-sm transition-colors ${tab === item ? "bg-surface font-medium text-ink shadow-xs" : "text-ink-2 hover:text-ink"}`}
                onClick={() => setTab(item)}
              >
                {item === "uploads" ? text.uploads : text.phosphor}
              </button>
            ))}
          </div>
          {tab === "uploads" ? (
            <div className="ml-auto flex min-w-0 items-center gap-1">
              <div className="relative">
                <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  className="plms-input h-8 w-56 pl-9"
                  aria-label={text.search}
                  placeholder={text.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void loadAssets();
                    }
                  }}
                />
              </div>
              <button type="button" className="plms-button-ghost h-8 w-8 px-0" onClick={() => void loadAssets()} aria-label={text.refresh} title={text.refresh}>
                <ArrowClockwise size={16} />
              </button>
            </div>
          ) : null}
        </div>

        {message ? <div role="status" className="rounded-lg bg-raised px-3 py-2 text-sm text-ink-2">{message}</div> : null}
        {uploading ? (
          <div className="flex items-center gap-2 rounded-lg bg-raised px-3 py-2 text-sm text-ink-2">
            <CircleNotch size={16} className="shrink-0 animate-spin text-accent" />
            <span>
              <span className="font-medium text-ink">{text.uploading}</span>
              <span className="text-ink-3"> · {text.uploadDescription}</span>
            </span>
          </div>
        ) : null}

        {tab === "uploads" ? (
          <div className="space-y-4">
            {canUpload ? (
              <label className={`flex items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-5 text-sm text-ink-2 transition-colors hover:bg-raised ${uploading ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
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
                        setMessage(response.data.deduplicated ? text.reused : text.uploaded);
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
                <UploadSimple size={18} className="shrink-0 text-ink-3" />
                <span>
                  <span className="block font-medium text-ink">{text.uploadCallout}</span>
                  <span className="block text-xs text-ink-3">{text.uploadHint}</span>
                </span>
              </label>
            ) : null}

            {assets.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-3">
                {loading ? <CircleNotch size={16} className="animate-spin" /> : null}
                {emptyText}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {assets.map((asset) => (
                  <article key={asset.id} className="overflow-hidden rounded-xl border border-line bg-surface">
                    <div className="flex aspect-square items-center justify-center border-b border-line bg-raised p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded asset served by the authenticated proxy; next/image would fetch it without the session */}
                      <img src={buildAssetContentUrl(asset.id)} alt={asset.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="space-y-0.5 px-3 pt-2.5">
                      <div className="truncate text-sm font-medium text-ink" title={asset.name}>{asset.name}</div>
                      <div className="flex items-center justify-between gap-2 font-mono text-xs text-ink-3">
                        <span className="min-w-0 truncate" title={asset.fileName}>{asset.fileName}</span>
                        <span className="shrink-0 tabular">{formatBytes(asset.byteSize)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 p-2">
                      <button
                        type="button"
                        className="plms-button-compact flex-1 disabled:cursor-wait"
                        disabled={uploading || insertingAssetId === asset.id}
                        onClick={async () => {
                          try {
                            setInsertingAssetId(asset.id);
                            onInsertImage({ name: asset.name, content: buildAssetContentUrl(asset.id), assetId: asset.id, assetSource: "upload" });
                          } catch (error) {
                            setMessage(error instanceof Error ? error.message : text.insertFailed);
                          } finally {
                            setInsertingAssetId(null);
                          }
                        }}
                      >
                        <Plus size={16} />
                        {insertingAssetId === asset.id ? text.adding : text.add}
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bad-soft hover:text-bad"
                          aria-label={`${text.delete}: ${asset.name}`}
                          title={text.delete}
                          onClick={async () => {
                            const response = await deleteAsset(asset.id);
                            if (response.success) {
                              setMessage(text.removed);
                              await loadAssets();
                            } else {
                              setMessage(response.error.message);
                            }
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-2">{text.phosphorDescription}</p>
            <PickerErrorBoundary
              fallback={
                <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                  {text.phosphorLoadFailed}
                </div>
              }
            >
              <PhosphorIconPicker
                onInsert={async ({ key, name }) => {
                  try {
                    const content = await phosphorIconToDataUri(key as PhosphorIconKey);
                    onInsertImage({ name, content, assetSource: "phosphor", assetKey: key });
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : text.phosphorInsertFailed);
                  }
                }}
              />
            </PickerErrorBoundary>
          </div>
        )}
      </div>
    </SlideOver>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
