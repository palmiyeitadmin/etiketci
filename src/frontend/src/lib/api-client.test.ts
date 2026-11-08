import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, extractErrorFromResponse, localizeApiError } from "@/lib/api-client";
import { useLanguageStore } from "@/lib/i18n/useLanguageStore";
import { textModules } from "@/lib/i18n/text";

function respondWith(status: number, body: unknown) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })));
}

async function failure(status: number, body: unknown) {
    respondWith(status, body);
    const result = await apiFetch("/api/anything");
    if (result.success) throw new Error("expected a failed response");
    return result.error;
}

describe("api client errors", () => {
    beforeEach(() => useLanguageStore.setState({ locale: "tr" }));
    afterEach(() => vi.unstubAllGlobals());

    it("shows a known code in the user's language and keeps the English as detail", async () => {
        const error = await failure(404, { success: false, error: "Print intent not found.", code: "print_intent_not_found" });

        expect(error).toMatchObject({ code: "print_intent_not_found", message: "Baskı talebi bulunamadı", detail: "Print intent not found." });
    });

    it("fills params and translates a raw status value", async () => {
        const error = await failure(400, {
            success: false,
            error: "Intent cannot be cancelled from 'UserPrinted' state.",
            code: "intent_cannot_cancel",
            params: { status: "UserPrinted" },
        });

        expect(error.message).toBe("Talep “Basıldı” durumunda olduğu için iptal edilemiyor");
        expect(error.params).toEqual({ status: "UserPrinted" });
    });

    it("follows the language switch", async () => {
        useLanguageStore.setState({ locale: "en" });
        const error = await failure(400, { success: false, error: "Printed quantity must be between 0 and 5.", code: "printed_quantity_out_of_range", params: { max: "5" } });

        expect(error.message).toBe("The printed quantity must be between 0 and 5");
    });

    it("keeps the English message for unknown codes and uncoded errors", async () => {
        expect(await failure(400, { success: false, error: "Something new.", code: "something_new" }))
            .toEqual({ code: "something_new", message: "Something new." });
        expect(await failure(400, { success: false, error: "Plain English." }))
            .toEqual({ code: "API_ERROR", message: "Plain English." });
    });

    it("translates each ASP.NET Identity rule", async () => {
        const error = await failure(400, {
            success: false,
            error: "Passwords must be at least 8 characters. Passwords must have at least one digit ('0'-'9').",
            code: "identity_error",
            errors: [
                { code: "PasswordTooShort", description: "Passwords must be at least 8 characters.", params: { n: "8" } },
                { code: "PasswordRequiresDigit", description: "Passwords must have at least one digit ('0'-'9').", params: { value: "0" } },
            ],
        });

        expect(error.code).toBe("identity_error");
        expect(error.message).toBe("Parola en az 8 karakter olmalı. Parolada en az bir rakam olmalı");
        expect(error.detail).toContain("Passwords must be at least 8 characters.");
    });

    it("keeps the description of an unknown Identity rule and reads the old string list", () => {
        const error = localizeApiError(extractErrorFromResponse({
            success: false,
            errors: [{ code: "SomethingElse", description: "Some rule." }, { code: "DuplicateEmail", description: "Email 'a@b.c' is already taken.", params: { value: "a@b.c" } }],
        }, 400), "tr");
        expect(error.message).toBe("Some rule. “a@b.c” e-postası zaten kullanılıyor");

        expect(extractErrorFromResponse({ success: false, errors: ["Old style."] }, 400))
            .toMatchObject({ code: "VALIDATION_ERROR", message: "Old style." });
    });

    it("has Turkish and English text for every API and Identity code", () => {
        for (const group of ["api", "identity"] as const) {
            const tr = textModules.errors.tr[group];
            const en = textModules.errors.en[group];
            expect(Object.keys(en).sort()).toEqual(Object.keys(tr).sort());
            for (const [code, phrase] of Object.entries(tr)) {
                const params = { status: "Pending", max: "3", fields: "a", sku: "X", permissions: "p", value: "v", n: "6" };
                // Every placeholder is filled, and no trailing period (house style).
                expect(phrase(params), `tr ${group}.${code}`).not.toMatch(/\?|undefined|\.$/);
                expect(en[code](params), `en ${group}.${code}`).not.toMatch(/\?|undefined|\.$/);
            }
        }
    });
});
