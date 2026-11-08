import { translate, translateKnownLabel, normalizeLocale } from "@/lib/i18n";

describe("i18n helpers", () => {
  it("resolves translated messages with interpolation", () => {
    expect(translate("tr", "pulse.waitingApproval", undefined, { count: 4 })).toBe("4 onay bekliyor");
    expect(translate("en", "pulse.waitingOutcome", undefined, { count: 2 })).toBe("2 prints awaiting outcome");
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
