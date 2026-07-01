import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import { addAuditSink, resetAuditSinks, type AuditEvent } from "@/shared/audit/audit";
import { ApiError } from "@/api/client";

const { mockApiRequest, mockFetchAuthAssurance, mockGetMfaSnapshot, mockVerifyTotpEnrollment } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
  mockFetchAuthAssurance: vi.fn(),
  mockGetMfaSnapshot: vi.fn(),
  mockVerifyTotpEnrollment: vi.fn(),
}));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return {
    ...actual,
    apiRequest: mockApiRequest,
  };
});

vi.mock("@/api/compliance.api", () => ({
  fetchAuthAssurance: mockFetchAuthAssurance,
}));

vi.mock("@/features/auth/mfa/mfaOperations", () => ({
  getMfaSnapshot: mockGetMfaSnapshot,
  enrollTotpFactor: vi.fn(),
  verifyTotpEnrollment: mockVerifyTotpEnrollment,
  verifyMfaChallenge: vi.fn(),
  unenrollFactor: vi.fn(),
}));

const meResponse = {
  id: 7,
  email: "user@example.com",
  username: "tester",
  supabase_uid: "uid-123",
  name: "Test User",
  created_at: "2026-03-24T00:00:00Z",
};

function LoginHarness() {
  const { login } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        void login("user@example.com", "secret12");
      }}
    >
      Sign in
    </button>
  );
}

function SignUpHarness() {
  const { signUp } = useAuth();
  const [result, setResult] = React.useState<string>("");

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const response = await signUp({
            name: "Test User",
            email: "user@example.com",
            password: "secret12",
            confirmPassword: "secret12",
          });
          setResult(JSON.stringify(response));
        }}
      >
        Sign up
      </button>
      <output>{result}</output>
    </>
  );
}

function RefreshMfaHarness() {
  const { refreshMfa, mfaError, mfaLoading } = useAuth();
  const [result, setResult] = React.useState("");

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const response = await refreshMfa();
          setResult(JSON.stringify(response));
        }}
      >
        Refresh MFA
      </button>
      <output data-testid="mfa-loading">{String(mfaLoading)}</output>
      <output data-testid="mfa-error">{mfaError ?? ""}</output>
      <output data-testid="mfa-result">{result}</output>
    </>
  );
}

function RefreshSessionHarness() {
  const { refreshSession, user, isAuthenticated } = useAuth();
  const [result, setResult] = React.useState("");

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            const response = await refreshSession();
            setResult(JSON.stringify(response));
          } catch (error) {
            setResult(error instanceof Error ? error.message : "unknown");
          }
        }}
      >
        Refresh session
      </button>
      <output data-testid="session-user">{user?.email ?? ""}</output>
      <output data-testid="session-authenticated">{String(isAuthenticated)}</output>
      <output data-testid="session-result">{result}</output>
    </>
  );
}

function VerifyTotpEnrollmentHarness() {
  const { verifyTotpEnrollment } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        void verifyTotpEnrollment("factor-1", "123 456");
      }}
    >
      Verify enrollment
    </button>
  );
}

function UpdateProfileHarness() {
  const { updateProfile, user, backendUser } = useAuth();
  const [result, setResult] = React.useState("");

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const response = await updateProfile({ name: "Updated Display Name" });
          setResult(JSON.stringify(response));
        }}
      >
        Update profile
      </button>
      <output data-testid="profile-name">{user?.name ?? ""}</output>
      <output data-testid="backend-profile-name">{backendUser?.name ?? ""}</output>
      <output data-testid="profile-update-result">{result}</output>
    </>
  );
}

describe("AuthProvider", () => {
  let events: AuditEvent[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    resetAuditSinks();
    addAuditSink((event) => {
      events.push(event);
    });
    mockApiRequest.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === "/api/auth/me/" && (!opts?.method || opts.method === "GET")) {
        throw new ApiError("Authentication required. Please sign in again.", 401);
      }
      throw new Error(`Unmocked apiRequest: ${path} ${opts?.method ?? ""}`);
    });
    mockFetchAuthAssurance.mockResolvedValue({
      mfa_required_by_policy: false,
      consent_required_by_policy: true,
      financial_consent_valid: true,
      assurance: { aal: null, amr: [], mfa_factors_count: 0 },
      aal_normalized: null,
      banking_allowed: true,
      blocking_code: null,
    });
    mockGetMfaSnapshot.mockResolvedValue({
      currentLevel: "aal1",
      nextLevel: "aal2",
      factors: [],
    });
    mockVerifyTotpEnrollment.mockResolvedValue({});
  });

  it("calls POST /api/auth/login/ then GET /api/auth/me/ on sign-in", async () => {
    let meCallCount = 0;
    mockApiRequest.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === "/api/auth/me/" && (!opts?.method || opts.method === "GET")) {
        meCallCount += 1;
        if (meCallCount === 1) {
          throw new ApiError("Authentication required. Please sign in again.", 401);
        }
        return meResponse;
      }
      if (path === "/api/auth/login/" && opts?.method === "POST") {
        return null;
      }
      throw new Error(`Unmocked: ${path}`);
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginHarness />
      </AuthProvider>
    );

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "secret12" }),
      });
    });

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/me/", { requireAuth: true });
    });
  });

  it("returns requiresVerification when signup succeeds without a session", async () => {
    mockApiRequest.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === "/api/auth/me/" && (!opts?.method || opts.method === "GET")) {
        throw new ApiError("Authentication required. Please sign in again.", 401);
      }
      if (path === "/api/auth/signup/" && opts?.method === "POST") {
        return { requires_verification: true };
      }
      throw new Error(`Unmocked: ${path}`);
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <SignUpHarness />
      </AuthProvider>
    );

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText('{"ok":true,"requiresVerification":true}')).toBeInTheDocument();
    });

    expect(events).toContainEqual(
      expect.objectContaining({
        event_name: "auth.signup",
        outcome: "success",
      })
    );
  });

  it("clears MFA loading when the snapshot refresh fails", async () => {
    mockApiRequest.mockResolvedValue(meResponse);
    let mfaCalls = 0;
    mockGetMfaSnapshot.mockImplementation(async () => {
      mfaCalls += 1;
      if (mfaCalls === 1) {
        return { currentLevel: "aal1" as const, nextLevel: "aal2" as const, factors: [] };
      }
      throw new Error("MFA status unavailable");
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <RefreshMfaHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh mfa/i })).toBeEnabled();
    });

    const assuranceCallsBeforeManualRefresh = mockFetchAuthAssurance.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /refresh mfa/i }));

    await waitFor(() => {
      expect(screen.getByTestId("mfa-loading")).toHaveTextContent("false");
      expect(screen.getByTestId("mfa-error")).toHaveTextContent("MFA status unavailable");
      expect(screen.getByTestId("mfa-result")).toHaveTextContent('"reason":"auth_assurance_unavailable"');
    });

    expect(mockFetchAuthAssurance.mock.calls.length).toBe(assuranceCallsBeforeManualRefresh);
  });

  it("records failed login attempts without logging secrets", async () => {
    mockApiRequest.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === "/api/auth/me/" && (!opts?.method || opts.method === "GET")) {
        throw new ApiError("Authentication required. Please sign in again.", 401);
      }
      if (path === "/api/auth/login/" && opts?.method === "POST") {
        throw new ApiError("Invalid login credentials", 401);
      }
      throw new Error(`Unmocked: ${path}`);
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginHarness />
      </AuthProvider>
    );

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(events).toContainEqual(
        expect.objectContaining({
          event_name: "auth.login",
          outcome: "failure",
          error_message: "Invalid login credentials",
        })
      );
    });
    expect(JSON.stringify(events)).not.toMatch(/secret12/);
  });

  it("preserves the current session on non-401 refresh failures", async () => {
    let meCallCount = 0;
    mockApiRequest.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === "/api/auth/me/" && (!opts?.method || opts.method === "GET")) {
        meCallCount += 1;
        if (meCallCount === 1) {
          return meResponse;
        }
        throw new ApiError("Temporary backend failure", 503);
      }
      throw new Error(`Unmocked: ${path}`);
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <RefreshSessionHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-user")).toHaveTextContent("user@example.com");
      expect(screen.getByTestId("session-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByRole("button", { name: /refresh session/i }));

    await waitFor(() => {
      expect(screen.getByTestId("session-result")).toHaveTextContent("Temporary backend failure");
      expect(screen.getByTestId("session-user")).toHaveTextContent("user@example.com");
      expect(screen.getByTestId("session-authenticated")).toHaveTextContent("true");
    });
  });

  it("patches the backend profile and updates the stored display name", async () => {
    mockApiRequest.mockImplementation(async (path: string, opts?: { method?: string; body?: string }) => {
      if (path === "/api/auth/me/" && (!opts?.method || opts.method === "GET")) {
        return meResponse;
      }
      if (path === "/api/auth/me/" && opts?.method === "PATCH") {
        return {
          ...meResponse,
          name: "Updated Display Name",
        };
      }
      throw new Error(`Unmocked: ${path}`);
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <UpdateProfileHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("profile-name")).toHaveTextContent("Test User");
    });

    await user.click(screen.getByRole("button", { name: /update profile/i }));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/me/", {
        requireAuth: true,
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Display Name" }),
      });
      expect(screen.getByTestId("profile-name")).toHaveTextContent("Updated Display Name");
      expect(screen.getByTestId("backend-profile-name")).toHaveTextContent("Updated Display Name");
      expect(screen.getByTestId("profile-update-result")).toHaveTextContent('{"ok":true}');
    });
  });

  it("refreshes MFA state after verifying TOTP enrollment", async () => {
    mockApiRequest.mockResolvedValue(meResponse);

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <VerifyTotpEnrollmentHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockGetMfaSnapshot).toHaveBeenCalledTimes(1);
    });

    mockGetMfaSnapshot.mockClear();
    mockFetchAuthAssurance.mockClear();

    await user.click(screen.getByRole("button", { name: /verify enrollment/i }));

    await waitFor(() => {
      expect(mockVerifyTotpEnrollment).toHaveBeenCalledWith("factor-1", "123 456");
      expect(mockGetMfaSnapshot).toHaveBeenCalledTimes(1);
      expect(mockFetchAuthAssurance).toHaveBeenCalledTimes(1);
    });
  });
});
