import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SignUpPage } from "../pages/SignUpPage";
import { toast } from "sonner";

const mockNavigate = vi.fn();
const mockSignUp = vi.fn();

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
    signUp: mockSignUp,
    isAuthenticated: false,
    isAuthReady: true,
  }),
}));

vi.mock("@/shared/components/brand/AppLogo", () => ({
  AppLogo: () => <div data-testid="app-logo" />,
}));

describe("SignUpPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows verify-email toast and does not navigate when verification is required", async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ ok: true, requiresVerification: true });

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Full name/i), "Test User");
    await user.type(screen.getByLabelText(/^Email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "secret12");
    await user.type(screen.getByLabelText(/Confirm password/i), "secret12");
    await user.click(screen.getByRole("button", { name: /Sign up/i }));

    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Check your email to verify your account.");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates to home when signup returns a session (no verification required)", async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ ok: true, requiresVerification: false });

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Full name/i), "Test User");
    await user.type(screen.getByLabelText(/^Email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "secret12");
    await user.type(screen.getByLabelText(/Confirm password/i), "secret12");
    await user.click(screen.getByRole("button", { name: /Sign up/i }));

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("shows the signup error and stays on the page when signup fails", async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ ok: false, error: "Email already exists" });

    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/Full name/i), "Test User");
    await user.type(screen.getByLabelText(/^Email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^Password$/i), "secret12");
    await user.type(screen.getByLabelText(/Confirm password/i), "secret12");
    await user.click(screen.getByRole("button", { name: /Sign up/i }));

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already exists");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
