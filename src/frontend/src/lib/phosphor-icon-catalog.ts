import { createElement } from "react";
import { Barcode, Circle, FilePdf, GearSix, ImageSquare, MagnifyingGlass, Package, Printer, QrCode, SealCheck, Sparkle, Square, Star, Tag, Triangle, WarningCircle, type Icon } from "@phosphor-icons/react";
import { renderToStaticMarkup } from "react-dom/server";
import { phosphorIconLoaders } from "@/lib/phosphor-icon-loaders";
import { phosphorIconManifest } from "@/lib/phosphor-icon-manifest";

export type PhosphorIconKey = keyof typeof phosphorIconLoaders;

export interface PhosphorIconCatalogItem {
  key: PhosphorIconKey;
  label: string;
  keywords: string[];
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
] as const satisfies readonly PhosphorIconKey[];

const FEATURED_ICON_COMPONENTS: Record<(typeof featuredPhosphorIconKeys)[number], Icon> = {
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

const manifestByKey = new Map<PhosphorIconKey, PhosphorIconCatalogItem>(
  phosphorIconManifest.map((item) => [item.key as PhosphorIconKey, item as PhosphorIconCatalogItem])
);

const componentCache = new Map<PhosphorIconKey, Icon>();
const promiseCache = new Map<PhosphorIconKey, Promise<Icon>>();

for (const key of featuredPhosphorIconKeys) {
  componentCache.set(key, FEATURED_ICON_COMPONENTS[key]);
}

export const phosphorIconCatalog = featuredPhosphorIconKeys
  .map((key) => manifestByKey.get(key))
  .filter((item): item is PhosphorIconCatalogItem => Boolean(item));

export const phosphorIconManifestItems = phosphorIconManifest as readonly PhosphorIconCatalogItem[];

export function getFeaturedPhosphorIcons() {
  return phosphorIconCatalog;
}

export function searchPhosphorIcons(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return phosphorIconManifestItems;
  }

  return phosphorIconManifestItems.filter((item) =>
    item.label.toLowerCase().includes(normalized) ||
    item.key.toLowerCase().includes(normalized) ||
    item.keywords.some((keyword) => keyword.includes(normalized))
  );
}

export async function loadPhosphorIconComponent(key: PhosphorIconKey): Promise<Icon> {
  const cached = componentCache.get(key);
  if (cached) {
    return cached;
  }

  const loader = phosphorIconLoaders[key];
  if (!loader) {
    throw new Error(`Unknown Phosphor icon key: ${key}`);
  }

  const existingPromise = promiseCache.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const nextPromise = loader()
    .then((IconComponent) => {
      componentCache.set(key, IconComponent);
      promiseCache.delete(key);
      return IconComponent;
    })
    .catch((error) => {
      promiseCache.delete(key);
      throw error;
    });

  promiseCache.set(key, nextPromise);
  return nextPromise;
}

export async function phosphorIconToDataUri(key: PhosphorIconKey, color = "#0f172a", size = 128) {
  const IconComponent = await loadPhosphorIconComponent(key);
  const svg = renderToStaticMarkup(
    createElement(IconComponent, { size, color, weight: "regular" })
  );

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
