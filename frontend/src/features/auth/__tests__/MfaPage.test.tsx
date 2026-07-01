import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MfaPage, MfaSetupPage, MfaVerifyPage } from "../pages/MfaPage";

const { mockNavigate, mockRefreshMfa, mockRefreshSession, mockLogout, authState } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockRefreshMfa: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockLogout: vi.fn(),
  authState: {
    isAuthReady: true,
    isAuthenticated: true,
    nextStep: "mfa_setup",
    postMfaStep: "onboarding_survey",
    nextRoute: "/mfa/setup",
    mfaSnapshot: { currentLevel: "aal1", nextLevel: null, factors: [] },
    mfaLoading: false,
    mfaError: null,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    ...authState,
    refreshMfa: mockRefreshMfa,
    refreshSession: mockRefreshSession,
    enrollTotpFactor: vi.fn(),
    verifyTotpEnrollment: vi.fn(),
    verifyMfaChallenge: vi.fn(),
    logout: mockLogout,
  }),
}));

vi.mock("@/shared/components/brand/AppLogo", () => ({
  AppLogo: () => <div data-testid="app-logo" />,
}));

vi.mock("@/shared/components/system", () => ({
  AppButton: ({ children, onClick, disabled, className }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  AppInput: (props: any) => <input {...props} />,
  AppSelect: ({ value, onValueChange, options }: any) => (
    <select aria-label="Authenticator app" value={value ?? ""} onChange={(event) => onValueChange?.(event.target.value)}>
      <option value="">Select</option>
      {options.map((option: { value: string; label: string }) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  FormField: ({ label, htmlFor, children }: any) => (
    <label htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  ),
  SectionHeader: ({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
  Surface: ({ children }: any) => <div>{children}</div>,
}));

describe("MFA pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthReady = true;
    authState.isAuthenticated = true;
    authState.nextStep = "mfa_setup";
    authState.postMfaStep = "onboarding_survey";
    authState.nextRoute = "/mfa/setup";
    authState.mfaSnapshot = { currentLevel: "aal1", nextLevel: null, factors: [] };
    authState.mfaLoading = false;
    authState.mfaError = null;
    mockRefreshMfa.mockResolvedValue({
      gate: { can: false, reason: "mfa_not_enrolled" },
      mfaSnapshot: authState.mfaSnapshot,
    });
    mockRefreshSession.mockResolvedValue({
      hasSession: true,
      me: { id: 1, email: "user@example.com", username: "user", supabase_uid: "uid" },
      nextStep: "dashboard",
      postMfaStep: null,
      nextRoute: "/",
    });
    mockLogout.mockResolvedValue(undefined);
  });

  it("resolver redirects verify-without-factor flows to setup", async () => {
    authState.nextStep = "mfa_verify";
    authState.nextRoute = "/mfa/verify";
    authState.mfaSnapshot = { currentLevel: "aal1", nextLevel: null, factors: [] };

    render(
      <MemoryRouter>
        <MfaPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/mfa/setup", { replace: true });
    });
  });

  it("renders setup copy without bouncing back to verify when no verified factor exists", async () => {
    authState.nextStep = "mfa_verify";
    authState.nextRoute = "/mfa/verify";
    authState.mfaSnapshot = { currentLevel: "aal1", nextLevel: null, factors: [] };

    render(
      <MemoryRouter>
        <MfaSetupPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Set up your authenticator app")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalledWith("/mfa/verify", { replace: true });
    });
  });

  it("redirects verify sessions without verified factors back to setup", async () => {
    authState.nextStep = "mfa_verify";
    authState.nextRoute = "/mfa/verify";
    authState.mfaSnapshot = { currentLevel: "aal1", nextLevel: null, factors: [] };
    mockRefreshMfa.mockResolvedValue({
      gate: { can: false, reason: "mfa_not_enrolled" },
      mfaSnapshot: { currentLevel: "aal1", nextLevel: null, factors: [] },
    });

    render(
      <MemoryRouter>
        <MfaVerifyPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/mfa/setup", { replace: true });
    });
  });
});


