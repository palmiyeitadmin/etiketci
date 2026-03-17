import { translate, translateKnownLabel, normalizeLocale } from "@/lib/i18n";

describe("i18n helpers", () => {
  it("resolves translated messages with interpolation", () => {
    expect(translate("tr", "dashboard.metrics.activeProducts", undefined, { count: 4 })).toBe("4 aktif");
    expect(translate("en", "approvals.requestedByOn", undefined, { user: "Alex", date: "2025-01-01" })).toBe("Requested by Alex on 2025-01-01");
  });

  it("falls back to the provided fallback when a key is missing", () => {
    expect(translate("tr", "missing.key", "Yedek")).toBe("Yedek");
  });

  it("translates known status labels and normalizes locales", () => {
    expect(translateKnownLabel("tr", "Draft")).toBe("Taslak");
    expect(translateKnownLabel("en", "Draft")).toBe("Draft");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("de")).toBe("tr");
  });
});
