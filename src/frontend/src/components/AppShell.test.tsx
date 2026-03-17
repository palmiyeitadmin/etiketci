import { createElement, type AnchorHTMLAttributes } from "react";
import { render } from "@testing-library/react";
import { AppShell } from "@/components/AppShell";

const mockUsePathname = vi.fn();
const mockUseSession = vi.fn();
const mockApiFetch = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/components/Operational/OperationalPulse", () => ({
  OperationalPulse: () => createElement("div", { "data-testid": "operational-pulse" }),
}));

vi.mock("@/components/Search/GlobalSearchPalette", () => ({
  GlobalSearchPalette: () => createElement("div", { "data-testid": "global-search-palette" }),
}));

describe("AppShell", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Test User",
          roles: ["Admin"],
          permissions: [],
          mustChangePassword: false,
        },
      },
    });
    mockApiFetch.mockResolvedValue({ success: false, error: { message: "ignored" } });
    mockUsePathname.mockReturnValue("/templates");
    mockReplace.mockReset();
  });

  it("uses a fixed-height shell for the editor route", () => {
    mockUsePathname.mockReturnValue("/templates/123/edit");

    const { container } = render(createElement(AppShell, null, createElement("div", null, "Editor")));

    const shellRoot = container.firstElementChild as HTMLElement | null;
    const main = container.querySelector("main");

    expect(shellRoot).not.toBeNull();
    expect(shellRoot?.className).toContain("h-screen");
    expect(shellRoot?.className).toContain("overflow-hidden");
    expect(main?.className).toContain("overflow-hidden");
    expect(main?.className).toContain("p-0");
  });

  it("keeps the standard min-height shell for non-editor routes", () => {
    const { container } = render(createElement(AppShell, null, createElement("div", null, "Templates")));

    const shellRoot = container.firstElementChild as HTMLElement | null;
    const main = container.querySelector("main");

    expect(shellRoot).not.toBeNull();
    expect(shellRoot?.className).toContain("min-h-screen");
    expect(main?.className).toContain("overflow-y-auto");
  });

  it("bypasses the shell for auth routes", () => {
    mockUsePathname.mockReturnValue("/auth/login");

    const { container } = render(
      createElement(AppShell, null, createElement("div", { "data-testid": "auth-child" }, "Auth"))
    );

    expect(container.querySelector("[data-testid='auth-child']")).not.toBeNull();
    expect(container.querySelector("main")).toBeNull();
  });
});
