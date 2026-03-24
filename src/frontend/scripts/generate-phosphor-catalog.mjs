import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const csrDir = path.join(projectRoot, "node_modules", "@phosphor-icons", "react", "dist", "csr");
const manifestPath = path.join(projectRoot, "src", "lib", "phosphor-icon-manifest.ts");
const loadersPath = path.join(projectRoot, "src", "lib", "phosphor-icon-loaders.ts");

function humanizeKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();
}

function buildKeywords(key, label) {
  const normalizedLabel = label.toLowerCase();
  const tokens = new Set([normalizedLabel, key.toLowerCase()]);
  for (const part of normalizedLabel.split(/[\s-]+/)) {
    if (part) {
      tokens.add(part);
    }
  }

  return Array.from(tokens);
}

function escapeString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildManifestContent(iconKeys) {
  const lines = [
    "export interface PhosphorIconManifestItem {",
    "  key: string;",
    "  label: string;",
    "  keywords: string[];",
    "}",
    "",
    "export const phosphorIconManifest = [",
  ];

  for (const key of iconKeys) {
    const label = humanizeKey(key);
    const keywords = buildKeywords(key, label)
      .map((keyword) => `"${escapeString(keyword)}"`)
      .join(", ");
    lines.push(`  { key: "${key}", label: "${escapeString(label)}", keywords: [${keywords}] },`);
  }

  lines.push("] as const satisfies readonly PhosphorIconManifestItem[];");
  lines.push("");
  return lines.join("\n");
}

function buildLoadersContent(iconKeys) {
  const lines = [
    'import { type Icon } from "@phosphor-icons/react";',
    "",
    "export type PhosphorIconLoader = () => Promise<Icon>;",
    "",
    "export const phosphorIconLoaders = {",
  ];

  for (const key of iconKeys) {
    lines.push(`  ${key}: () => import("@phosphor-icons/react/${key}").then((mod) => mod.${key}),`);
  }

  lines.push("} as const satisfies Record<string, PhosphorIconLoader>;");
  lines.push("");
  return lines.join("\n");
}

const iconKeys = fs
  .readdirSync(csrDir)
  .filter((file) => file.endsWith(".es.js"))
  .map((file) => file.replace(/\.es\.js$/, ""))
  .filter((key) => /^[A-Z]/.test(key) && !key.endsWith("Icon") && key !== "IconContext")
  .sort((left, right) => left.localeCompare(right));

fs.writeFileSync(manifestPath, buildManifestContent(iconKeys), "utf8");
fs.writeFileSync(loadersPath, buildLoadersContent(iconKeys), "utf8");

console.log(`Generated ${iconKeys.length} Phosphor icon manifest entries.`);
