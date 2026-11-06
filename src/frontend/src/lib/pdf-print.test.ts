import { openPdfDocument } from "@/lib/pdf-print";

describe("pdf print helper", () => {
  it("opens the direct pdf in a new tab", () => {
    const tab = { closed: false, opener: {} } as unknown as Window;
    const opener = vi.fn(() => tab);

    const result = openPdfDocument("/api/templates/1/versions/2/preview-file", opener);

    expect(result).toBe(true);
    expect(opener).toHaveBeenCalledWith("/api/templates/1/versions/2/preview-file", "_blank");
    expect(tab.opener).toBeNull();
  });

  it("never asks for noopener, because window.open then returns null even on success", () => {
    const opener = vi.fn(() => ({ closed: false, opener: null } as unknown as Window));

    openPdfDocument("/x.pdf", opener);

    const features = (opener.mock.calls[0] as unknown[])[2];
    expect(String(features ?? "")).not.toContain("noopener");
  });

  it("returns false when popup opening is blocked", () => {
    const opener = vi.fn(() => null);

    const result = openPdfDocument("/api/templates/1/versions/2/preview-file", opener);

    expect(result).toBe(false);
  });

  it("returns false when url is missing", () => {
    const opener = vi.fn(() => ({ closed: false } as Window));

    const result = openPdfDocument("", opener);

    expect(result).toBe(false);
    expect(opener).not.toHaveBeenCalled();
  });
});
