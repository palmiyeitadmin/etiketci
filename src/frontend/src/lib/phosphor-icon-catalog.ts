import { createElement } from "react";
import {
  Barcode,
  Circle,
  FilePdf,
  GearSix,
  ImageSquare,
  MagnifyingGlass,
  Package,
  Printer,
  QrCode,
  SealCheck,
  Sparkle,
  Square,
  Star,
  Tag,
  Triangle,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import { renderToStaticMarkup } from "react-dom/server";

export type PhosphorIconKey = string;

export interface PhosphorIconCatalogItem {
  key: PhosphorIconKey;
  label: string;
  keywords: string[];
  Icon: Icon;
}

export const featuredPhosphorIconKeys = [
  "MagnifyingGlass",
  "Package",
  "Barcode",
  "QrCode",
  "ImageSquare",
  "Tag",
  "Printer",
  "FilePdf",
  "WarningCircle",
  "Circle",
  "Square",
  "Triangle",
  "GearSix",
  "Sparkle",
  "SealCheck",
  "Star",
] as const;

const FEATURED_ICON_COMPONENTS: Record<string, Icon> = {
  MagnifyingGlass,
  Package,
  Barcode,
  QrCode,
  ImageSquare,
  Tag,
  Printer,
  FilePdf,
  WarningCircle,
  Circle,
  Square,
  Triangle,
  GearSix,
  Sparkle,
  SealCheck,
  Star,
};

export const phosphorIconCatalog: PhosphorIconCatalogItem[] = featuredPhosphorIconKeys.map((key) =>
  buildCatalogItem(key, FEATURED_ICON_COMPONENTS[key])
);

let fullCatalogCache: PhosphorIconCatalogItem[] | null = null;
let fullCatalogPromise: Promise<PhosphorIconCatalogItem[]> | null = null;

function buildCatalogItem(key: string, IconComponent: Icon): PhosphorIconCatalogItem {
  const label = humanizePhosphorKey(key);
  return {
    key,
    label,
    keywords: buildKeywords(key, label),
    Icon: IconComponent,
  };
}

function humanizePhosphorKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();
}

function buildKeywords(key: string, label: string) {
  const tokens = new Set<string>();
  const normalizedLabel = label.toLowerCase();
  tokens.add(normalizedLabel);
  for (const part of normalizedLabel.split(/[\s-]+/)) {
    if (part) {
      tokens.add(part);
    }
  }

  const normalizedKey = key.toLowerCase();
  tokens.add(normalizedKey);
  return Array.from(tokens);
}

function filterCatalog(catalog: PhosphorIconCatalogItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return catalog;
  }

  return catalog.filter((item) =>
    item.label.toLowerCase().includes(normalized) ||
    item.key.toLowerCase().includes(normalized) ||
    item.keywords.some((keyword) => keyword.includes(normalized))
  );
}

export function getFeaturedPhosphorIcons() {
  return phosphorIconCatalog;
}

export async function loadFullPhosphorIconCatalog() {
  if (fullCatalogCache) {
    return fullCatalogCache;
  }

  if (!fullCatalogPromise) {
    fullCatalogPromise = import("./phosphor-icon-catalog-full").then(({ fullPhosphorIconExports }) => {
      const items = fullPhosphorIconExports
        .map(({ key, Icon }) => buildCatalogItem(key, Icon))
        .sort((left, right) => left.label.localeCompare(right.label));

      fullCatalogCache = items;
      return items;
    });
  }

  return fullCatalogPromise;
}

export async function searchPhosphorIcons(query: string, options?: { includeFull?: boolean }) {
  const normalized = query.trim();
  if (!options?.includeFull && !normalized) {
    return phosphorIconCatalog;
  }

  const catalog = options?.includeFull || normalized
    ? await loadFullPhosphorIconCatalog()
    : phosphorIconCatalog;

  return filterCatalog(catalog, query);
}

export async function phosphorIconToDataUri(key: PhosphorIconKey, color = "#0f172a", size = 128) {
  const featured = FEATURED_ICON_COMPONENTS[key];
  if (featured) {
    return renderIconToDataUri(featured, color, size);
  }

  const catalog = await loadFullPhosphorIconCatalog();
  const item = catalog.find((entry) => entry.key === key);
  if (!item) {
    return "";
  }

  return renderIconToDataUri(item.Icon, color, size);
}

function renderIconToDataUri(IconComponent: Icon, color: string, size: number) {
  const svg = renderToStaticMarkup(
    createElement(IconComponent, { size, color, weight: "regular" })
  );

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
