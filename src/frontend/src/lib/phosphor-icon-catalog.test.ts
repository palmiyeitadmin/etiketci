import { describe, expect, it } from "vitest";
import {
  getFeaturedPhosphorIcons,
  loadFullPhosphorIconCatalog,
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

  it("loads the full Phosphor catalog lazily", async () => {
    const fullCatalog = await loadFullPhosphorIconCatalog();

    expect(fullCatalog.length).toBeGreaterThan(1000);
    expect(fullCatalog.some((item) => item.key === "Acorn")).toBe(true);
    expect(fullCatalog.some((item) => item.key === "MagnifyingGlass")).toBe(true);
  });

  it("searches the full catalog when requested", async () => {
    const results = await searchPhosphorIcons("acorn", { includeFull: true });

    expect(results.some((item) => item.key === "Acorn")).toBe(true);
  });

  it("renders a data uri for featured and full-catalog icons", async () => {
    const featuredUri = await phosphorIconToDataUri("Star");
    const fullUri = await phosphorIconToDataUri("Acorn");

    expect(featuredUri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(fullUri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  });
});
