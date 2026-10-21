import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage, buildOAuthRedirectUriAfter } from "../pages/LoginPage";
import { toast } from "sonner";
import { DemoLoginAPI } from "@/api/users.api";

const { mockNavigate, mockLogin, mockGetApiBaseUrl } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogin: vi.fn(),
  mockGetApiBaseUrl: vi.fn(() => "http://127.0.0.1:8000"),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    isAuthReady: true,
    nextRoute: "/",
  }),
}));

vi.mock("@/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/api/client")>("@/api/client");
  return {
    ...actual,
    getApiBaseUrl: mockGetApiBaseUrl,
  };
});

vi.mock("@/api/users.api", () => ({
  DemoLoginAPI: { status: vi.fn().mockResolvedValue({ enabled: false }) },
}));

vi.mock("@/shared/components/brand/AppLogo", () => ({
  AppLogo: () => <div data-testid="app-logo" />,
}));

describe("LoginPage", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiBaseUrl.mockReturnValue("http://127.0.0.1:8000");
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("uses the API loopback hostname for OAuth callbacks when loopback hosts are mixed", () => {
    expect(buildOAuthRedirectUriAfter("http://127.0.0.1:8000", { origin: "http://[::1]:3000" })).toBe(
      "http://127.0.0.1:3000/auth/callback"
    );
  });

  it("keeps the current origin for non-loopback hosts", () => {
    expect(buildOAuthRedirectUriAfter("https://api.example.com", { origin: "https://app.example.com" })).toBe(
      "https://app.example.com/auth/callback"
    );
  });

  it("offers the demo account only when the backend enables it", async () => {
    vi.mocked(DemoLoginAPI.status).mockResolvedValueOnce({ enabled: true });
    const { unmount } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(await screen.findByRole("button", { name: /try the demo account/i })).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(DemoLoginAPI.status).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("button", { name: /try the demo account/i })).not.toBeInTheDocument();
  });

  it("shows only the demo account when password sign-in isn't configured", async () => {
    vi.mocked(DemoLoginAPI.status).mockResolvedValueOnce({ enabled: true, password_login_configured: false });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(await screen.findByRole("button", { name: /try the demo account/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Email$/i)).not.toBeInTheDocument();
  });

  it("navigates to the route returned by login", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ ok: true, nextRoute: "/" });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(await screen.findByLabelText(/^Email$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "secret12");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("user@example.com", "secret12");
      expect(toast.success).toHaveBeenCalledWith("Welcome back!");
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("navigates to MFA setup when login indicates MFA enrollment is required", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ ok: true, nextRoute: "/mfa/setup" });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(await screen.findByLabelText(/^Email$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "secret12");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/mfa/setup", { replace: true });
    });
  });

  it("shows a toast when password login fails", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ ok: false, error: "Invalid login credentials" });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(await screen.findByLabelText(/^Email$/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid login credentials");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("starts Google sign-in with the backend OAuth endpoint and callback route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authorize_url:
          "https://supabase.example.test/authorize?redirect_to=http%3A%2F%2F127.0.0.1%3A8000%2Fapi%2Fauth%2Foauth%2Fcallback%2F",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
        origin: "http://127.0.0.1:3000",
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/auth/oauth/start/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
          redirect_uri_after: "http://127.0.0.1:3000/auth/callback",
        }),
      });
      expect(assignMock).toHaveBeenCalledWith(
        "https://supabase.example.test/authorize?redirect_to=http%3A%2F%2F127.0.0.1%3A8000%2Fapi%2Fauth%2Foauth%2Fcallback%2F"
      );
    });

    vi.unstubAllGlobals();
  });

  it("shows the backend error when Google sign-in cannot start", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "SUPABASE_OAUTH_REDIRECT_URI is not configured." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("SUPABASE_OAUTH_REDIRECT_URI is not configured.");
    });

    vi.unstubAllGlobals();
  });

  it("shows a clear error when the backend OAuth callback host mismatches the API host", async () => {
    const user = userEvent.setup();
    mockGetApiBaseUrl.mockReturnValue("http://127.0.0.1:8000");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authorize_url:
          "https://supabase.example.test/authorize?redirect_to=http%3A%2F%2F%5B%3A%3A1%5D%3A8000%2Fapi%2Fauth%2Foauth%2Fcallback%2F",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
        origin: "http://127.0.0.1:3000",
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Google auth is misconfigured for local development. Backend OAuth callback host ([::1]) does not match API host (127.0.0.1). Align VITE_API_URL and SUPABASE_OAUTH_REDIRECT_URI."
      );
    });

    expect(assignMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

