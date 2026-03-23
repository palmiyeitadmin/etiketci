import { openPdfDocument } from "@/lib/pdf-print";

describe("pdf print helper", () => {
  it("opens the direct pdf in a new tab", () => {
    const opener = vi.fn(() => ({ closed: false } as Window));

    const result = openPdfDocument("/api/templates/1/versions/2/preview-file", opener);

    expect(result).toBe(true);
    expect(opener).toHaveBeenCalledWith(
      "/api/templates/1/versions/2/preview-file",
      "_blank",
      "noopener,noreferrer",
    );
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
