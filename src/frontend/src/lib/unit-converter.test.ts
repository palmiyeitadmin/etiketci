import { EDITOR_NUDGE_MM, EDITOR_NUDGE_SHIFT_MM, EDITOR_SNAP_MM, ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";

describe("unit converter precision", () => {
  it("uses sub-pixel preview rendering for the screen profile", () => {
    expect(ScreenPreviewProfile.roundToGrid).toBe(false);
  });

  it("snaps values to the configured 0.1 mm editor grid", () => {
    expect(EDITOR_SNAP_MM).toBe(0.1);
    expect(UnitConverter.snapToGrid(12.34, EDITOR_SNAP_MM)).toBe(12.3);
    expect(UnitConverter.snapToGrid(12.36, EDITOR_SNAP_MM)).toBe(12.4);
  });

  it("keeps editor nudge constants aligned with the chosen precision model", () => {
    expect(EDITOR_NUDGE_MM).toBe(0.1);
    expect(EDITOR_NUDGE_SHIFT_MM).toBe(1);
  });

  it("persists millimeter values to two decimal places", () => {
    expect(UnitConverter.toPersisted(10.356)).toBe(10.36);
    expect(UnitConverter.toPersisted(4.654)).toBe(4.65);
  });
});
