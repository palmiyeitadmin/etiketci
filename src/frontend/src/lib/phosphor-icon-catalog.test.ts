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
