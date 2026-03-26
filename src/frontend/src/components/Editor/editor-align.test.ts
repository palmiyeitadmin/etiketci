import { groupElementsInModel, ungroupGroupInModel } from "@/components/Editor/editor-actions";
import { alignSelection, distributeSelection, matchSelectionSize } from "@/components/Editor/editor-align";
import { normalizeCanonicalLabelModel } from "@/lib/editor-canonical";

describe("editor alignment helpers", () => {
  it("aligns selection to the left-most edge of the selection bounds", () => {
    const model = normalizeCanonicalLabelModel({
      name: "Align",
      dimensions: { widthMm: 100, heightMm: 80 },
      elements: [
        { id: "a", type: "rect", xMm: 10, yMm: 10, widthMm: 10, heightMm: 10, content: "" },
        { id: "b", type: "rect", xMm: 30, yMm: 14, widthMm: 12, heightMm: 10, content: "" },
      ],
    });

    const aligned = alignSelection(model, ["a", "b"], "left", "selection");

    expect(aligned.elements.find((element) => element.id === "a")?.xMm).toBe(10);
    expect(aligned.elements.find((element) => element.id === "b")?.xMm).toBe(10);
  });

  it("distributes selection horizontally and matches width against the primary element", () => {
    const model = normalizeCanonicalLabelModel({
      name: "Distribute",
      dimensions: { widthMm: 120, heightMm: 80 },
      elements: [
        { id: "a", type: "rect", xMm: 10, yMm: 10, widthMm: 10, heightMm: 10, content: "" },
        { id: "b", type: "rect", xMm: 30, yMm: 10, widthMm: 6, heightMm: 10, content: "" },
        { id: "c", type: "rect", xMm: 60, yMm: 10, widthMm: 8, heightMm: 10, content: "" },
      ],
    });

    const distributed = distributeSelection(model, ["a", "b", "c"], "horizontal");
    expect(distributed.elements.find((element) => element.id === "b")?.xMm).toBe(37);

    const matched = matchSelectionSize(distributed, ["a", "b", "c"], "width", "a");
    expect(matched.elements.find((element) => element.id === "b")?.widthMm).toBe(10);
    expect(matched.elements.find((element) => element.id === "c")?.widthMm).toBe(10);
  });
});

describe("editor grouping helpers", () => {
  it("groups a flat selection and ungroups it without changing ordering", () => {
    const model = normalizeCanonicalLabelModel({
      name: "Group",
      dimensions: { widthMm: 100, heightMm: 80 },
      elements: [
        { id: "a", type: "rect", xMm: 5, yMm: 5, widthMm: 10, heightMm: 10, content: "" },
        { id: "b", type: "text", xMm: 20, yMm: 5, widthMm: 12, heightMm: 10, content: "B" },
        { id: "c", type: "ellipse", xMm: 40, yMm: 5, widthMm: 10, heightMm: 10, content: "" },
      ],
    });

    const grouped = groupElementsInModel(model, ["a", "b"], "Header");
    const groupedIds = grouped.model.elements.filter((element) => element.groupId === grouped.groupId).map((element) => element.id);

    expect(grouped.groupId).toBeTruthy();
    expect(groupedIds).toEqual(["a", "b"]);

    const ungrouped = ungroupGroupInModel(grouped.model, grouped.groupId);
    expect(ungrouped.elements.map((element) => element.id)).toEqual(["a", "b", "c"]);
    expect(ungrouped.elements.every((element) => !element.groupId)).toBe(true);
  });
});
