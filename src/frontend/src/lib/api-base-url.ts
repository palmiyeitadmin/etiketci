const DEFAULT_API_BASE_URL = "http://192.168.0.99:8080";
const BROWSER_API_PROXY_BASE = "/api/plms";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return BROWSER_API_PROXY_BASE;
  }

  const configured = process.env.API_INTERNAL_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) {
    return DEFAULT_API_BASE_URL;
  }

  return trimTrailingSlash(configured);
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
