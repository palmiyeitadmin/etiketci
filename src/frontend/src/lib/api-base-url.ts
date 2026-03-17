const DEFAULT_API_BASE_URL = "http://localhost:8080";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configured = (
    typeof window === "undefined"
      ? process.env.API_INTERNAL_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim()
      : process.env.NEXT_PUBLIC_API_URL?.trim()
  );
  if (!configured) {
    return DEFAULT_API_BASE_URL;
  }

  return trimTrailingSlash(configured);
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
