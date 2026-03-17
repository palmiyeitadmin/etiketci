import { apiFetch } from "@/lib/api-client";
import { GlobalSearchResult } from "@/types/search";

export async function searchEverywhere(query: string, limit = 6) {
  return apiFetch<GlobalSearchResult>(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}
