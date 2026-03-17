export interface SearchItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  type: string;
  badge?: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  items: SearchItem[];
}

export interface GlobalSearchResult {
  groups: SearchGroup[];
}
