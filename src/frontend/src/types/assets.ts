export interface ContentAssetSummary {
  id: string;
  name: string;
  kind: string;
  mimeType: string;
  fileName: string;
  byteSize: number;
  widthPx?: number | null;
  heightPx?: number | null;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface ContentAssetDetail extends ContentAssetSummary {
  sha256Hash: string;
  updatedBy?: string | null;
  updatedAt: string;
  tagsJson?: string | null;
}

export interface CreateContentAssetResponse {
  deduplicated: boolean;
  asset: ContentAssetDetail;
}
