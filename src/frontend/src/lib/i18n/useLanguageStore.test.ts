import { useLanguageStore } from "@/lib/i18n";

describe("useLanguageStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "plms_locale=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    useLanguageStore.setState({ locale: "tr", hydrated: false });
  });

  it("persists locale changes to localStorage and cookies", () => {
    useLanguageStore.getState().setLocale("en");

    expect(useLanguageStore.getState().locale).toBe("en");
    expect(useLanguageStore.getState().hydrated).toBe(true);
    expect(window.localStorage.getItem("plms.locale")).toBe("en");
    expect(document.cookie).toContain("plms_locale=en");
  });

  it("hydrates locale from persisted storage", () => {
    window.localStorage.setItem("plms.locale", "en");

    useLanguageStore.getState().hydrateFromStorageAndCookie();

    expect(useLanguageStore.getState().locale).toBe("en");
    expect(useLanguageStore.getState().hydrated).toBe(true);
  });
});
