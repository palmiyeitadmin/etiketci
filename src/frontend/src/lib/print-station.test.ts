import { buildPrintIntentPdfUrl, minutesSince, normalizeScan, parseQuantity, pickDefaultTemplate, printableTemplates } from "@/lib/print-station";
import { openPendingTab } from "@/lib/pdf-print";
import type { ProductTemplateDto } from "@/types/operational";

const template = (overrides: Partial<ProductTemplateDto>): ProductTemplateDto => ({
    id: "link",
    productId: "p",
    productName: "Ürün",
    templateId: "t",
    templateName: "Raf etiketi",
    templateCode: "RAF-001",
    isDefault: false,
    isActive: true,
    publishedVersionId: "v1",
    publishedVersionNumber: 1,
    widthMm: 60,
    heightMm: 40,
    ...overrides,
});

describe("print station helpers", () => {
    it("cleans scanner input", () => {
        expect(normalizeScan("  ZYT-0500-SZM\r\n")).toBe("ZYT-0500-SZM");
        expect(normalizeScan("\tABC\u0003")).toBe("ABC");
    });

    it("parses quantities in range only", () => {
        expect(parseQuantity("12")).toBe(12);
        expect(parseQuantity("1.000")).toBe(1000);
        expect(parseQuantity("0")).toBeNull();
        expect(parseQuantity("2001")).toBeNull();
        expect(parseQuantity("3,5")).toBeNull();
        expect(parseQuantity("")).toBeNull();
    });

    it("prefers the default printable template and skips unpublished ones", () => {
        const unpublishedDefault = template({ id: "a", isDefault: true, publishedVersionId: null });
        const published = template({ id: "b" });
        const publishedDefault = template({ id: "c", isDefault: true });

        expect(printableTemplates([unpublishedDefault, published]).map((t) => t.id)).toEqual(["b"]);
        expect(pickDefaultTemplate([unpublishedDefault, published])?.id).toBe("b");
        expect(pickDefaultTemplate([published, publishedDefault])?.id).toBe("c");
        expect(pickDefaultTemplate([unpublishedDefault])).toBeUndefined();
    });

    it("builds the print PDF route", () => {
        expect(buildPrintIntentPdfUrl("abc")).toBe("/api/print-intents/abc/pdf");
    });

    it("counts minutes since a moment", () => {
        const now = Date.parse("2026-11-08T12:00:00Z");
        expect(minutesSince("2026-11-08T11:15:30Z", now)).toBe(44);
        expect(minutesSince("2026-11-08T13:00:00Z", now)).toBe(0);
        expect(minutesSince(null, now)).toBe(0);
    });
});

describe("openPendingTab", () => {
    it("opens a blank tab first and points it at the PDF later", () => {
        const tab = { closed: false, opener: {}, location: { href: "" }, close: vi.fn() } as unknown as Window;
        const opener = vi.fn(() => tab);

        const pending = openPendingTab(opener);

        expect(opener).toHaveBeenCalledWith("about:blank", "_blank");
        expect(tab.opener).toBeNull();
        expect(pending?.navigate("/api/print-intents/1/pdf")).toBe(true);
        expect(tab.location.href).toBe("/api/print-intents/1/pdf");
    });

    it("returns null when the browser blocks the tab", () => {
        expect(openPendingTab(vi.fn(() => null))).toBeNull();
    });
});
