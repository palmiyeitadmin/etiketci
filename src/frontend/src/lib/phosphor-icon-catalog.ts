import { createElement } from "react";
import { Barcode, Circle, FilePdf, GearSix, ImageSquare, MagnifyingGlass, Package, Printer, QrCode, SealCheck, Sparkle, Square, Star, Tag, Triangle, WarningCircle, type Icon } from "@phosphor-icons/react";
import { renderToStaticMarkup } from "react-dom/server";
import { phosphorIconLoaders } from "@/lib/phosphor-icon-loaders";
import { phosphorIconManifest } from "@/lib/phosphor-icon-manifest";
import { turkishIconAliases } from "@/lib/phosphor-icon-aliases-tr";
import { turkishIconName } from "@/lib/phosphor-icon-names-tr";

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

/** Lowercase with Turkish rules (İ → i, I → ı), then without diacritics, so "seker" also finds "şeker". */
function foldTurkish(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .trim();
}

const foldedAliases = Object.entries(turkishIconAliases).map(([word, keys]) => ({ word: foldTurkish(word), keys }));

/** Icon keys whose Turkish search words contain the query. */
function turkishAliasMatches(folded: string) {
  // Ordered: the first key listed for the matching word comes first in the results.
  const keys = new Set<string>();
  for (const alias of foldedAliases) {
    // Short alias words ("el", "su") would match inside unrelated queries ("cetvel"), so only longer ones match that way.
    if (alias.word.includes(folded) || (folded.length >= 3 && alias.word.length >= 3 && folded.includes(alias.word))) {
      alias.keys.forEach((key) => keys.add(key));
    }
  }
  return keys;
}

let foldedTurkishNames: Map<string, string> | null = null;

/** Folded Turkish names with punctuation turned into spaces, so a query can match at the start of any word. */
function getFoldedTurkishNames() {
  if (!foldedTurkishNames) {
    foldedTurkishNames = new Map(
      phosphorIconManifestItems.map((item) => [item.key, ` ${foldTurkish(turkishIconName(item.key)).replace(/[^a-z0-9#@+]+/g, " ")} `])
    );
  }
  return foldedTurkishNames;
}

export interface PhosphorIconSearchOptions {
  /** Also match the Turkish display names (the picker turns this on when the UI is Turkish). */
  turkishNames?: boolean;
}

export function searchPhosphorIcons(query: string, options: PhosphorIconSearchOptions = {}) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return phosphorIconManifestItems;
  }

  const folded = foldTurkish(query);
  const aliasKeys = turkishAliasMatches(folded);
  if (options.turkishNames) {
    // Word starts only, so "ok" finds "Aşağı ok" but not "Kokteyl bardağı".
    // Names whose first words are the query come first: "güneş paneli" puts "Güneş paneli" on top.
    const needle = ` ${folded.replace(/[^a-z0-9#@+]+/g, " ").trim()}`;
    if (needle.trim()) {
      const leading: string[] = [];
      const inner: string[] = [];
      getFoldedTurkishNames().forEach((name, key) => {
        if (name.startsWith(`${needle} `)) leading.push(key);
        else if (name.includes(needle)) inner.push(key);
      });
      const ordered = new Set([...leading, ...Array.from(aliasKeys), ...inner]);
      aliasKeys.clear();
      ordered.forEach((key) => aliasKeys.add(key));
    }
  }
  const aliasHits = Array.from(aliasKeys)
    .map((key) => manifestByKey.get(key as PhosphorIconKey))
    .filter((item): item is PhosphorIconCatalogItem => Boolean(item));
  const englishHits = phosphorIconManifestItems.filter((item) =>
    !aliasKeys.has(item.key) && (
      item.label.toLowerCase().includes(normalized) ||
      item.key.toLowerCase().includes(normalized) ||
      item.keywords.some((keyword) => keyword.includes(normalized))
    )
  );

  // Turkish matches first: they are what a Turkish user meant.
  return [...aliasHits, ...englishHits];
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
