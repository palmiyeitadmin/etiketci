import { describe, expect, it } from "vitest";
import {
    apiErrorText,
    auditSummary,
    checkMessages,
    importErrorText,
    permissionGroupLabel,
    permissionLabel,
    roleDisplayName,
    snapshotIssues,
} from "@/lib/backend-text";

describe("backend text", () => {
    it("translates permissions and built-in roles, keeps unknown ones", () => {
        expect(permissionLabel("tr", "printintents.reprint")).toBe("Yeniden bas");
        expect(permissionLabel("tr", "future.key", "Future thing")).toBe("Future thing");
        expect(permissionGroupLabel("tr", "printintents")).toBe("Baskı");
        expect(roleDisplayName("tr", "Admin")).toBe("Yönetici");
        expect(roleDisplayName("tr", "Depo")).toBe("Depo");
    });

    it("phrases readiness issues from a PascalCase snapshot", () => {
        const snapshot = JSON.stringify({
            Status: 2,
            Errors: ["Missing required data for variable: product.name"],
            Issues: [{ Code: "variable_missing", Severity: "error", Params: { name: "product.name" }, FromSnapshot: false }],
        });
        expect(checkMessages("tr", snapshotIssues(snapshot))).toEqual(["“product.name” alanı için üründe veri yok"]);
    });

    it("falls back to the English messages for old snapshots", () => {
        expect(checkMessages("tr", snapshotIssues(JSON.stringify({ Errors: ["x"] })), ["x"])).toEqual(["x"]);
        expect(snapshotIssues("not json")).toEqual([]);
    });

    it("marks findings recorded at request time", () => {
        expect(checkMessages("en", [{ code: "product_not_linked", severity: "warning", params: {}, fromSnapshot: true }]))
            .toEqual(["At request time: The product is not linked to this template"]);
    });

    it("translates import errors with their value", () => {
        expect(importErrorText("tr", { errorType: "UnknownVendor", value: "EGE" })).toBe("“EGE” kodlu tedarikçi bulunamadı");
        expect(importErrorText("tr", { errorType: "InvalidReference", message: "Category Code 'X' not found." })).toBe("Category Code 'X' not found.");
    });

    it("uses API error codes when known", () => {
        expect(apiErrorText("tr", { code: "safety_check_failed", message: "Final safety check failed." }, "?")).toBe("Son güvenlik kontrolü geçilemedi");
        expect(apiErrorText("tr", { message: "Something else" }, "?")).toBe("Something else");
        expect(apiErrorText("tr", { code: "version_not_editable", params: { status: "InReview" }, message: "Only Draft versions can be edited." }, "?"))
            .toBe("Sürüm “İncelemede” durumunda. Yalnızca taslaklar düzenlenebilir");
        expect(apiErrorText("en", { code: "unknown_permissions", params: { permissions: "a.b, c.d" } }, "?")).toBe("Unknown permissions: a.b, c.d");
    });

    it("summarizes audit entries from metadata", () => {
        expect(auditSummary("tr", "ImportSessionCommitted", JSON.stringify({ imported: 12, updated: 3 }))).toBe("12 ürün eklendi, 3 güncellendi");
        expect(auditSummary("tr", "PrintIntentFailed", JSON.stringify({ category: "alignment", printedQuantity: 1, quantity: 2 }))).toBe("Kayma veya hizalama · 1 / 2 düzgün");
        expect(auditSummary("en", "RoleUpdated", JSON.stringify({ name: "Depo", added: ["a"], removed: [] }))).toBe("Depo · 1 permission added");
        expect(auditSummary("tr", "VendorCreated", "")).toBeNull();
    });
});
