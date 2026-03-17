export function buildTemplatePreviewFileUrl(templateId: string, versionId: string, productId?: string | null): string {
  const params = new URLSearchParams();
  if (productId) {
    params.set("productId", productId);
  }

  const query = params.toString();
  return `/api/templates/${templateId}/versions/${versionId}/preview-file${query ? `?${query}` : ""}`;
}

export function buildTemplatePreviewDownloadUrl(templateId: string, versionId: string, productId?: string | null): string {
  const params = new URLSearchParams();
  if (productId) {
    params.set("productId", productId);
  }

  const query = params.toString();
  return `/api/templates/${templateId}/versions/${versionId}/preview-download${query ? `?${query}` : ""}`;
}
