import { buildApiUrl, getApiBaseUrl } from "@/lib/api-base-url";

describe("api base url", () => {
  it("uses the same-origin proxy in the browser", () => {
    expect(getApiBaseUrl()).toBe("/api/plms");
    expect(buildApiUrl("/api/Templates")).toBe("/api/plms/api/Templates");
  });
});
