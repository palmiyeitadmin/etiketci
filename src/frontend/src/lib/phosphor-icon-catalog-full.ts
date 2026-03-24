import * as PhosphorIcons from "@phosphor-icons/react";
import { type Icon } from "@phosphor-icons/react";

export interface RawPhosphorIconExport {
  key: string;
  Icon: Icon;
}

function isPhosphorIconExport(value: unknown): value is Icon {
  return Boolean(
    value &&
    typeof value === "object" &&
    "$$typeof" in (value as Record<string, unknown>) &&
    "render" in (value as Record<string, unknown>)
  );
}

export const fullPhosphorIconExports: RawPhosphorIconExport[] = Object.keys(PhosphorIcons)
  .filter((key) => /^[A-Z]/.test(key) && !key.endsWith("Icon") && key !== "IconContext")
  .map((key) => {
    const value = (PhosphorIcons as Record<string, unknown>)[key];
    return isPhosphorIconExport(value) ? { key, Icon: value } : null;
  })
  .filter((item): item is RawPhosphorIconExport => item !== null);
