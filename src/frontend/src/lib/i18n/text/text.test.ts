import { messages } from "@/lib/i18n/messages";
import { getText } from "@/lib/i18n/useText";
import { textModules } from "@/lib/i18n/text";
import { auditActionLabel, auditEntityLabel } from "@/lib/dashboard-feed";

/** Same keys on both sides, recursively; functions must have the same arity. */
function shapeDiff(tr: unknown, en: unknown, path = ""): string[] {
    if (typeof tr === "function" || typeof en === "function") {
        return typeof tr === typeof en && (tr as () => void).length === (en as () => void).length ? [] : [path];
    }
    if (typeof tr !== "object" || tr === null) {
        return typeof tr === typeof en ? [] : [path];
    }
    const left = tr as Record<string, unknown>;
    const right = (en ?? {}) as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return Array.from(keys).flatMap((key) => (key in left && key in right ? shapeDiff(left[key], right[key], `${path}.${key}`) : [`${path}.${key}`]));
}

describe("message modules", () => {
    it("keeps Turkish and English in the same shape", () => {
        expect(shapeDiff(messages.tr, messages.en)).toEqual([]);
        for (const [name, module] of Object.entries(textModules)) {
            expect({ name, diff: shapeDiff(module.tr, module.en) }).toEqual({ name, diff: [] });
        }
    });

    it("has no empty strings", () => {
        const empty: string[] = [];
        const walk = (node: unknown, path: string) => {
            if (typeof node === "string" && node.trim() === "") empty.push(path);
            if (node && typeof node === "object") Object.entries(node).forEach(([k, v]) => walk(v, `${path}.${k}`));
        };
        walk(messages, "messages");
        walk(textModules, "text");
        expect(empty).toEqual([]);
    });

    it("returns the module for the requested language", () => {
        expect(getText("audit", "tr").actions.PrintIntentUserPrinted).toBe("Etiketler basıldı");
        expect(getText("audit", "en").actions.PrintIntentUserPrinted).toBe("Labels printed");
    });

    it("labels audit actions and humanizes unknown ones", () => {
        expect(auditActionLabel("tr", "ProductDeactivated")).toBe("Ürün pasife alındı");
        expect(auditActionLabel("en", "SomethingNewHappened")).toBe("Something new happened");
        expect(auditEntityLabel("tr", "PrintIntent")).toBe("Baskı talebi");
    });
});
