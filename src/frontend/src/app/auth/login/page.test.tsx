import { render, waitFor } from "@testing-library/react";
import LoginPage from "@/app/auth/login/page";
import { useLanguageStore } from "@/lib/i18n";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
const mockUseSession = vi.fn();
const mockSignIn = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: () => mockUseSession(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    useLanguageStore.setState({ locale: "tr", hydrated: true });
    mockPush.mockReset();
    mockReplace.mockReset();
    mockRefresh.mockReset();
    mockSignIn.mockReset();
    mockSearchParamsGet.mockReset();
    mockSearchParamsGet.mockReturnValue(null);
    mockUseSession.mockReturnValue({ status: "unauthenticated" });
  });

  it("renders the showcase panel and the login form", () => {
    const { getByText, getByLabelText, getByRole } = render(<LoginPage />);

    expect(getByText("Profil, aksesuar ve koli etiketlerini tek yerden yönetin")).not.toBeNull();
    expect(getByRole("heading", { name: "Giriş yap" })).not.toBeNull();
    expect(getByRole("button", { name: "Giriş yap" })).not.toBeNull();
    expect(getByLabelText("E-posta")).not.toBeNull();
    expect(getByLabelText("Parola")).not.toBeNull();
  });

  it("redirects authenticated users away from the login page", async () => {
    mockUseSession.mockReturnValue({ status: "authenticated" });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });
});
