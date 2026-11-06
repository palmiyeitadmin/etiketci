"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadAsset, listAssets, deleteAsset, buildAssetContentUrl } from "@/lib/assets";
import { useI18n } from "@/lib/i18n";
import { phosphorIconToDataUri, type PhosphorIconKey } from "@/lib/phosphor-icon-catalog";
import { hasPermission, permissions } from "@/lib/permissions";
import { ContentAssetSummary } from "@/types/assets";
import { PhosphorIconPicker } from "@/components/Editor/PhosphorIconPicker";
import { PickerErrorBoundary } from "@/components/Editor/PickerErrorBoundary";
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
  const { locale } = useI18n();
  const { data: session } = useSession();
  const text = locale === "tr"
    ? {
      title: "Paylaşılan İçerik Kütüphanesi",
      heading: "Varlıklar ve ikonlar",
      description: "Aynı dosyayı her şablona yeniden yüklemeden, yüklenmiş görselleri ve seçili Phosphor ikonlarını tekrar kullanın.",
      uploads: "Yüklemeler",
      phosphor: "Phosphor",
      search: "Varlık ara",
      refresh: "Yenile",
      close: "Kapat",
      loading: "Kütüphane yükleniyor...",
      empty: "Paylaşılan varlık bulunamadı.",
      uploading: "Yükleniyor",
      uploadDescription: "Varlık paylaşılan kütüphaneye ekleniyor ve tekrarlar kontrol ediliyor.",
      uploadCallout: "PNG, JPEG veya SVG dosyasını paylaşılan kütüphaneye yükleyin",
      uploadHint: "Varlık başına 5 MB'a kadar",
      reused: "Mevcut paylaşılan varlık yeniden kullanıldı.",
      uploaded: "Varlık paylaşılan kütüphaneye yüklendi.",
      removed: "Varlık paylaşılan kütüphaneden kaldırıldı.",
      insertFailed: "Varlık eklenemedi.",
      add: "Ekle",
      adding: "Ekleniyor",
      delete: "Sil",
      phosphorDescription: "Sık kullanılan ikonları hızlı ekleyin veya tüm Phosphor kataloğunu arayarak tuvale yerleştirin.",
      phosphorLoadFailed: "Phosphor ikon tarayıcısı yüklenemedi.",
      phosphorInsertFailed: "Phosphor ikon eklenemedi.",
    }
    : {
      title: "Shared Content Library",
      heading: "Assets and icons",
      description: "Reuse uploaded visuals and curated Phosphor icons without re-uploading the same file into every template.",
      uploads: "Uploads",
      phosphor: "Phosphor",
      search: "Search assets",
      refresh: "Refresh",
      close: "Close",
      loading: "Loading library...",
      empty: "No shared assets found.",
      uploading: "Uploading",
      uploadDescription: "Adding asset to shared library and checking for duplicates.",
      uploadCallout: "Upload PNG, JPEG or SVG into the shared library",
      uploadHint: "Up to 5 MB per asset",
      reused: "Existing shared asset reused.",
      uploaded: "Asset uploaded to shared library.",
      removed: "Asset removed from shared library.",
      insertFailed: "Asset could not be inserted.",
      add: "Add",
      adding: "Adding",
      delete: "Delete",
      phosphorDescription: "Add featured icons quickly or search the full Phosphor catalog before inserting into the canvas.",
      phosphorLoadFailed: "Phosphor icon browser could not be loaded.",
      phosphorInsertFailed: "Phosphor icon could not be inserted.",
    };
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

  const emptyText = useMemo(() => loading ? text.loading : text.empty, [loading, text.empty, text.loading]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] bg-ink/30" onClick={onClose}>
      <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-line bg-surface" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-line px-6 py-6">
          <div>
            <div className="text-xs font-medium text-ink-3">{text.title}</div>
            <h2 className="mt-2 text-2xl font-medium text-ink">{text.heading}</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-3">{text.description}</p>
          </div>
          <button className="plms-button-secondary" onClick={onClose}>{text.close}</button>
        </div>

        <div className="flex items-center gap-2 border-b border-line px-6 py-4">
          <button className={`plms-button-compact ${tab === "uploads" ? "border-accent/30 bg-accent/10 text-ink" : ""}`} onClick={() => setTab("uploads")}>{text.uploads}</button>
          <button className={`plms-button-compact ${tab === "phosphor" ? "border-accent/30 bg-accent/10 text-ink" : ""}`} onClick={() => setTab("phosphor")}>{text.phosphor}</button>
          {tab === "uploads" ? (
            <div className="ml-auto flex items-center gap-2">
              <input className="plms-input w-72" placeholder={text.search} value={query} onChange={(event) => setQuery(event.target.value)} />
              <button className="plms-button-compact" onClick={() => void loadAssets()}>{text.refresh}</button>
            </div>
          ) : null}
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {message ? <div className="mb-4 rounded-lg border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">{message}</div> : null}
          {uploading ? (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-accent/20 px-4 py-3 text-sm text-accent">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent/30" />
              <div>
                <div className="text-xs font-medium text-accent">{text.uploading}</div>
                <div className="mt-1 text-sm text-accent">{text.uploadDescription}</div>
              </div>
            </div>
          ) : null}

          {tab === "uploads" ? (
            <div className="space-y-5">
              {canUpload ? (
                <label className={`flex items-center justify-center rounded-lg border border-dashed border-line-strong bg-raised px-4 py-5 text-center text-sm text-ink-3 transition-colors hover:bg-raised ${uploading ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
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
                  <div>
                    <div>{text.uploadCallout}</div>
                    <div className="mt-1 text-xs text-ink-3">{text.uploadHint}</div>
                  </div>
                </label>
              ) : null}

              {assets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line px-4 py-12 text-center text-sm text-ink-3">{emptyText}</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {assets.map((asset) => (
                    <article key={asset.id} className="rounded-lg border border-line bg-raised p-4">
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-line bg-raised">
                        <img src={buildAssetContentUrl(asset.id)} alt={asset.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="mt-3 truncate text-sm font-medium text-ink">{asset.name}</div>
                      <div className="mt-1 truncate text-xs text-ink-3">{asset.fileName}</div>
                      <div className="mt-1 text-xs font-medium text-ink-3">{formatBytes(asset.byteSize)}</div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="plms-button-compact disabled:cursor-wait disabled:opacity-60"
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
                          {insertingAssetId === asset.id ? text.adding : text.add}
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            className="inline-flex min-w-0 items-center justify-center rounded-xl bg-bad px-3 py-2 text-xs font-medium text-white"
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
                            {text.delete}
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
              <div className="rounded-lg border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">
                {text.phosphorDescription}
              </div>
              <PickerErrorBoundary
                fallback={
                  <div className="rounded-lg border border-bad/20 bg-bad/10 px-4 py-6 text-sm text-bad">
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
      </div>
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
