"use client";

import { useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/components/PermissionGuard";
import { apiFetch } from "@/lib/api-client";
import { buildAssetContentUrl, deleteAsset, listAssets, uploadAsset } from "@/lib/assets";
import { useI18n } from "@/lib/i18n";
import { permissions } from "@/lib/permissions";
import { ContentAssetSummary } from "@/types/assets";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "next-auth/react";

export default function ContentLibraryPage() {
  const { locale } = useI18n();
  const { data: session } = useSession();
  const userPermissions = ((session?.user as any)?.permissions || []) as string[];
  const canUpload = userPermissions.includes(permissions.assetsUpload) || ((session?.user as any)?.roles || []).includes("Admin");
  const canDelete = userPermissions.includes(permissions.assetsDelete) || ((session?.user as any)?.roles || []).includes("Admin");
  const [assets, setAssets] = useState<ContentAssetSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const text = locale === "tr"
    ? {
      eyebrow: "Paylaşılan içerik",
      title: "İçerik Kütüphanesi",
      description: "Yönetimli şablonlar arasında tekrar kullanmak için yüklenen görsellerin tekilleştirilmiş havuzu.",
      uploading: "Yükleniyor...",
      uploadAsset: "Varlık Yükle",
      reused: "Mevcut paylaşılan varlık yeniden kullanıldı.",
      uploaded: "Varlık yüklendi.",
      search: "Varlık adı veya dosya adına göre ara",
      refresh: "Yenile",
      uploadStatusTitle: "Yükleniyor",
      uploadStatusDescription: "Paylaşılan kütüphane varlığınızı işliyor. Maksimum boyut 5 MB.",
      emptyTitle: "Paylaşılan varlık yok",
      emptyDescription: "Tekrar kullanılabilir görselleri bir kez yükleyin ve kütüphaneden istediğiniz şablona ekleyin.",
      removed: "Varlık kaldırıldı.",
      delete: "Sil",
    }
    : {
      eyebrow: "Shared content",
      title: "Content Library",
      description: "Deduplicated uploaded visuals for reuse across governed templates.",
      uploading: "Uploading...",
      uploadAsset: "Upload Asset",
      reused: "Existing shared asset reused.",
      uploaded: "Asset uploaded.",
      search: "Search asset name or filename",
      refresh: "Refresh",
      uploadStatusTitle: "Uploading",
      uploadStatusDescription: "Shared library is processing your asset. Maximum size is 5 MB.",
      emptyTitle: "No shared assets",
      emptyDescription: "Upload reusable visuals once and insert them into any template from the library.",
      removed: "Asset removed.",
      delete: "Delete",
    };

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
          eyebrow={text.eyebrow}
          title={text.title}
          description={text.description}
          actions={canUpload ? (
            <label className={`plms-button-primary ${uploading ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
              {uploading ? text.uploading : text.uploadAsset}
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
          left={<input className="plms-input max-w-xl" placeholder={text.search} value={query} onChange={(event) => setQuery(event.target.value)} />}
          right={<button className="plms-button-secondary" onClick={() => void load()}>{text.refresh}</button>}
        />

        {message ? <div className="rounded-lg border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">{message}</div> : null}
        {uploading ? (
          <div className="flex items-center gap-3 rounded-lg border border-accent/20 px-4 py-3 text-sm text-accent">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent/30" />
            <div>
              <div className="text-xs font-medium text-accent">{text.uploadStatusTitle}</div>
              <div className="mt-1 text-sm text-accent">{text.uploadStatusDescription}</div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((asset) => (
              <article key={asset.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-line bg-raised">
                  <img src={buildAssetContentUrl(asset.id)} alt={asset.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="mt-4 truncate text-sm font-medium text-ink">{asset.name}</div>
                <div className="mt-1 truncate text-xs text-ink-3">{asset.fileName}</div>
                <div className="mt-2 flex items-center justify-between text-xs font-medium text-ink-3">
                  <span>{Math.round(asset.byteSize / 1024)} KB</span>
                  <span>{asset.mimeType.replace("image/", "")}</span>
                </div>
                {canDelete ? <button className="mt-4 w-full rounded-lg bg-bad px-4 py-3 text-xs font-medium text-white" onClick={async () => { const response = await deleteAsset(asset.id); if (response.success) { setMessage(text.removed); await load(); } }}>{text.delete}</button> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
