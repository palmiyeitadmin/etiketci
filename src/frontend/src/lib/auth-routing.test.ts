import {
  buildLoginRedirectPath,
  isProtectedAppPath,
  isPublicAuthPath,
  resolveAuthRoute,
} from "@/lib/auth-routing";

describe("auth routing", () => {
  it("identifies public auth pages", () => {
    expect(isPublicAuthPath("/auth/login")).toBe(true);
    expect(isPublicAuthPath("/auth/setup-password")).toBe(true);
    expect(isPublicAuthPath("/auth/force-change-password")).toBe(false);
  });

  it("identifies protected application routes", () => {
    expect(isProtectedAppPath("/")).toBe(true);
    expect(isProtectedAppPath("/products")).toBe(true);
    expect(isProtectedAppPath("/products/123")).toBe(true);
    expect(isProtectedAppPath("/auth/force-change-password")).toBe(true);
    expect(isProtectedAppPath("/auth/login")).toBe(false);
  });

  it("builds login redirect destinations with callback preservation", () => {
    expect(buildLoginRedirectPath("/products?tab=all")).toBe("/auth/login?callbackUrl=%2Fproducts%3Ftab%3Dall");
  });

  it("redirects unauthenticated users from protected routes", () => {
    expect(resolveAuthRoute("/", "", false)).toEqual({
      action: "redirectLogin",
      destination: "/auth/login?callbackUrl=%2F",
    });

    expect(resolveAuthRoute("/templates/123", "?view=timeline", false)).toEqual({
      action: "redirectLogin",
      destination: "/auth/login?callbackUrl=%2Ftemplates%2F123%3Fview%3Dtimeline",
    });
  });

  it("redirects authenticated users away from the login page", () => {
    expect(resolveAuthRoute("/auth/login", "", true)).toEqual({ action: "redirectHome" });
  });

  it("allows public routes when unauthenticated", () => {
    expect(resolveAuthRoute("/auth/login", "", false)).toEqual({ action: "allow" });
    expect(resolveAuthRoute("/auth/setup-password", "?token=abc", false)).toEqual({ action: "allow" });
  });
});
