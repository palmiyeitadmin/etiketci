import { createElement } from "react";
import {
  Asterisk,
  Barcode,
  Buildings,
  Circle,
  Cube,
  CursorClick,
  FilePdf,
  GearSix,
  ImageSquare,
  Lightning,
  MagnifyingGlass,
  Package,
  Palette,
  Printer,
  QrCode,
  Scan,
  SealCheck,
  Shield,
  Sparkle,
  Square,
  Star,
  Sticker,
  Tag,
  Triangle,
  User,
  Users,
  WarningCircle,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";
import { renderToStaticMarkup } from "react-dom/server";

export type PhosphorIconKey =
  | "MagnifyingGlass"
  | "Package"
  | "Barcode"
  | "QrCode"
  | "ImageSquare"
  | "Palette"
  | "Sticker"
  | "Cube"
  | "Tag"
  | "Printer"
  | "FilePdf"
  | "Lightning"
  | "WarningCircle"
  | "Circle"
  | "Square"
  | "Triangle"
  | "GearSix"
  | "Scan"
  | "Sparkle"
  | "SealCheck"
  | "Users"
  | "User"
  | "Shield"
  | "Buildings"
  | "Wrench"
  | "CursorClick"
  | "Asterisk"
  | "Star";

export interface PhosphorIconCatalogItem {
  key: PhosphorIconKey;
  label: string;
  keywords: string[];
  Icon: Icon;
}

export const phosphorIconCatalog: PhosphorIconCatalogItem[] = [
  { key: "MagnifyingGlass", label: "Search", keywords: ["search", "find", "inspect"], Icon: MagnifyingGlass },
  { key: "Package", label: "Package", keywords: ["package", "box", "product"], Icon: Package },
  { key: "Barcode", label: "Barcode", keywords: ["barcode", "scan", "sku"], Icon: Barcode },
  { key: "QrCode", label: "QR Code", keywords: ["qr", "code", "scan"], Icon: QrCode },
  { key: "ImageSquare", label: "Image", keywords: ["image", "picture", "asset"], Icon: ImageSquare },
  { key: "Palette", label: "Palette", keywords: ["palette", "design", "brand"], Icon: Palette },
  { key: "Sticker", label: "Sticker", keywords: ["sticker", "label", "shape"], Icon: Sticker },
  { key: "Cube", label: "Cube", keywords: ["cube", "packaging", "3d"], Icon: Cube },
  { key: "Tag", label: "Tag", keywords: ["tag", "price", "label"], Icon: Tag },
  { key: "Printer", label: "Printer", keywords: ["printer", "print", "queue"], Icon: Printer },
  { key: "FilePdf", label: "PDF", keywords: ["pdf", "document", "file"], Icon: FilePdf },
  { key: "Lightning", label: "Lightning", keywords: ["fast", "speed", "bolt"], Icon: Lightning },
  { key: "WarningCircle", label: "Warning", keywords: ["warning", "alert", "risk"], Icon: WarningCircle },
  { key: "Circle", label: "Circle", keywords: ["circle", "shape", "round"], Icon: Circle },
  { key: "Square", label: "Square", keywords: ["square", "shape", "box"], Icon: Square },
  { key: "Triangle", label: "Triangle", keywords: ["triangle", "shape", "warning"], Icon: Triangle },
  { key: "GearSix", label: "Settings", keywords: ["settings", "gear", "admin"], Icon: GearSix },
  { key: "Scan", label: "Scan", keywords: ["scan", "reader", "device"], Icon: Scan },
  { key: "Sparkle", label: "Sparkle", keywords: ["sparkle", "premium", "shine"], Icon: Sparkle },
  { key: "SealCheck", label: "Seal", keywords: ["seal", "approved", "quality"], Icon: SealCheck },
  { key: "Users", label: "Users", keywords: ["users", "team", "people"], Icon: Users },
  { key: "User", label: "User", keywords: ["user", "profile", "person"], Icon: User },
  { key: "Shield", label: "Shield", keywords: ["shield", "security", "guard"], Icon: Shield },
  { key: "Buildings", label: "Building", keywords: ["building", "vendor", "company"], Icon: Buildings },
  { key: "Wrench", label: "Wrench", keywords: ["wrench", "service", "repair"], Icon: Wrench },
  { key: "CursorClick", label: "Pointer", keywords: ["cursor", "click", "select"], Icon: CursorClick },
  { key: "Asterisk", label: "Asterisk", keywords: ["asterisk", "marker", "star"], Icon: Asterisk },
  { key: "Star", label: "Star", keywords: ["star", "favorite", "featured"], Icon: Star },
];

export function searchPhosphorIcons(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return phosphorIconCatalog;
  }

  return phosphorIconCatalog.filter((item) =>
    item.label.toLowerCase().includes(normalized) ||
    item.key.toLowerCase().includes(normalized) ||
    item.keywords.some((keyword) => keyword.includes(normalized))
  );
}

export function phosphorIconToDataUri(key: PhosphorIconKey, color = "#0f172a", size = 128) {
  const item = phosphorIconCatalog.find((entry) => entry.key === key);
  if (!item) {
    return "";
  }

  const svg = renderToStaticMarkup(
    createElement(item.Icon, { size, color, weight: "regular" })
  );
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
