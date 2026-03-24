import { addElementToModel, duplicateElementInModel, fitViewportToContainer, nudgeElementInModel, renameModel, resizeModelCanvas } from "@/components/Editor/editor-actions";
import { normalizeCanonicalLabelModel } from "@/lib/editor-canonical";

describe("editor canonical helpers", () => {
  it("normalizes legacy models with safe defaults", () => {
    const model = normalizeCanonicalLabelModel({
      name: "Legacy",
      dimensions: { widthMm: 80, heightMm: 120 },
      elements: [{ id: "text-1", type: "text", xMm: 1, yMm: 2, widthMm: 30, heightMm: 10, content: "Hello" }],
    });

    expect(model.elements[0]).toMatchObject({
      name: "Text 1",
      visible: true,
      locked: false,
      textAlign: "left",
      fontWeight: "normal",
      font: "Arial",
    });
  });

  it("duplicates and nudges elements with persisted mm precision", () => {
    const base = normalizeCanonicalLabelModel({
      name: "Draft",
      dimensions: { widthMm: 100, heightMm: 150 },
      elements: [{ id: "rect-1", type: "rect", xMm: 10, yMm: 12, widthMm: 20, heightMm: 30, content: "" }],
    });

    const duplicated = duplicateElementInModel(base, "rect-1");
    expect(duplicated.element).not.toBeNull();
    expect(duplicated.model.elements).toHaveLength(2);

    const nudged = nudgeElementInModel(duplicated.model, duplicated.element!.id, 1, -2);
    const copy = nudged.elements.find((element) => element.id === duplicated.element!.id);

    expect(copy?.xMm).toBe(14);
    expect(copy?.yMm).toBe(13);
  });

  it("preserves sub-millimeter nudge precision with two-decimal storage", () => {
    const base = normalizeCanonicalLabelModel({
      name: "Draft",
      dimensions: { widthMm: 100, heightMm: 150 },
      elements: [{ id: "text-1", type: "text", xMm: 10.25, yMm: 4.75, widthMm: 20, heightMm: 10, content: "Hello" }],
    });

    const nudged = nudgeElementInModel(base, "text-1", 0.1, -0.1);
    const element = nudged.elements.find((item) => item.id === "text-1");

    expect(element?.xMm).toBe(10.35);
    expect(element?.yMm).toBe(4.65);
  });

  it("adds new elements and computes fit viewport bounds", () => {
    const base = normalizeCanonicalLabelModel({
      name: "Draft",
      dimensions: { widthMm: 100, heightMm: 150 },
      elements: [],
    });

    const result = addElementToModel(base, "barcode", { xMm: 8, yMm: 9 });
    expect(result.element.type).toBe("barcode");
    expect(result.element.name).toBe("Barcode 1");

    const viewport = fitViewportToContainer(400, 600, 1200, 900, 48);
    expect(viewport.zoom).toBeGreaterThan(0.2);
    expect(viewport.offsetX).toBe(0);
    expect(viewport.offsetY).toBe(0);
  });

  it("renames the canonical model and resizes canvas without touching element geometry", () => {
    const base = normalizeCanonicalLabelModel({
      name: "Draft",
      dimensions: { widthMm: 100, heightMm: 150 },
      elements: [{ id: "rect-1", type: "rect", xMm: 10, yMm: 12, widthMm: 20, heightMm: 30, content: "" }],
    });

    const renamed = renameModel(base, "Renamed");
    const resized = resizeModelCanvas(renamed, { widthMm: 110.25, heightMm: 85.5 });

    expect(resized.name).toBe("Renamed");
    expect(resized.dimensions).toEqual({ widthMm: 110.25, heightMm: 85.5 });
    expect(resized.elements[0]).toMatchObject({ xMm: 10, yMm: 12, widthMm: 20, heightMm: 30 });
  });
});
