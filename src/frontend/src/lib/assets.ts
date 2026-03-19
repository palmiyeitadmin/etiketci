import { apiFetch } from "@/lib/api-client";
import { ContentAssetDetail, ContentAssetSummary, CreateContentAssetResponse } from "@/types/assets";

export async function listAssets(query = "") {
  return apiFetch<ContentAssetSummary[]>(`/api/assets?query=${encodeURIComponent(query)}&page=1&pageSize=36`);
}

export async function uploadAsset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<CreateContentAssetResponse>("/api/assets", {
    method: "POST",
    body: formData,
  });
}

export async function getAsset(id: string) {
  return apiFetch<ContentAssetDetail>(`/api/assets/${id}`);
}

export async function deleteAsset(id: string) {
  return apiFetch<boolean>(`/api/assets/${id}`, { method: "DELETE" });
}

export function buildAssetContentUrl(id: string) {
  return `/api/assets/${id}/content`;
}
