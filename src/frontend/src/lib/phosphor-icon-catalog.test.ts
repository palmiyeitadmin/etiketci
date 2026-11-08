import { turkishIconAliases } from "@/lib/phosphor-icon-aliases-tr";
import { describe, expect, it } from "vitest";
import {
  getFeaturedPhosphorIcons,
  loadPhosphorIconComponent,
  phosphorIconToDataUri,
  searchPhosphorIcons,
} from "@/lib/phosphor-icon-catalog";

describe("phosphor-icon-catalog", () => {
  it("returns featured icons by default", () => {
    const featured = getFeaturedPhosphorIcons();

    expect(featured.length).toBeGreaterThan(10);
    expect(featured.some((item) => item.key === "Star")).toBe(true);
    expect(featured.some((item) => item.key === "Barcode")).toBe(true);
  });

  it("searches the generated full manifest synchronously", () => {
    const results = searchPhosphorIcons("acorn");

    expect(results.some((item) => item.key === "Acorn")).toBe(true);
    expect(results.some((item) => item.key === "Star")).toBe(false);
  });

  it("loads icon components through the generated loader map", async () => {
    const featuredIcon = await loadPhosphorIconComponent("Star");
    const fullIcon = await loadPhosphorIconComponent("Acorn");

    expect(featuredIcon).toBeDefined();
    expect(fullIcon).toBeDefined();
  });

  it("throws a controlled error for unknown icon keys", async () => {
    await expect(loadPhosphorIconComponent("MissingIcon" as never)).rejects.toThrow("Unknown Phosphor icon key: MissingIcon");
  });

  it("renders a data uri for featured and full-catalog icons", async () => {
    const featuredUri = await phosphorIconToDataUri("Star");
    const fullUri = await phosphorIconToDataUri("Acorn");

    expect(featuredUri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(fullUri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  });
});

describe("Turkish icon search", () => {
  it("finds icons by Turkish words, first", () => {
    const keys = searchPhosphorIcons("yıldız").map((item) => item.key);
    expect(keys[0]).toBe("Star");
    expect(searchPhosphorIcons("koli").map((item) => item.key)).toContain("Package");
    expect(searchPhosphorIcons("barkod").map((item) => item.key)).toContain("Barcode");
  });

  it("ignores Turkish case and missing diacritics", () => {
    expect(searchPhosphorIcons("YILDIZ").map((item) => item.key)).toContain("Star");
    expect(searchPhosphorIcons("uyari").map((item) => item.key)).toContain("Warning");
    expect(searchPhosphorIcons("SOĞUK").map((item) => item.key)).toContain("Snowflake");
  });

  it("still finds English names", () => {
    expect(searchPhosphorIcons("printer").map((item) => item.key)).toContain("Printer");
  });

  it("only points at icons that exist", () => {
    const known = new Set<string>(searchPhosphorIcons("").map((item) => item.key));
    const missing = Object.values(turkishIconAliases).flat().filter((key) => !known.has(key));
    expect(missing).toEqual([]);
  });

  it("matches Turkish words at the start of a word", () => {
    const ok = searchPhosphorIcons("ok", { turkishNames: true }).map((item) => item.key);
    expect(ok).not.toContain("Avocado");
    const kar = searchPhosphorIcons("kar", { turkishNames: true }).map((item) => item.key);
    expect(kar).toContain("Snowflake");
    expect(kar.slice(0, 5)).not.toContain("ArrowUp");
  });
});
