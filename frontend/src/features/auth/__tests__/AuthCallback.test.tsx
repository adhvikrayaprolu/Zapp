import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthCallback } from "../pages/AuthCallback";

const { mockNavigate, mockRefreshSession } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockRefreshSession: vi.fn(),
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
    refreshSession: mockRefreshSession,
  }),
}));

describe("AuthCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshSession.mockResolvedValue({
      hasSession: true,
      me: { id: 1, email: "u@example.com", username: "u", supabase_uid: "uid" },
      nextStep: "dashboard",
      postMfaStep: null,
      nextRoute: "/",
    });
  });

  it("navigates to the route returned by refreshSession", async () => {
    mockRefreshSession.mockResolvedValue({
      hasSession: true,
      me: { id: 1, email: "u@example.com", username: "u", supabase_uid: "uid" },
      nextStep: "mfa_setup",
      postMfaStep: "onboarding_survey",
      nextRoute: "/mfa/setup",
    });

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/mfa/setup", { replace: true });
    });
  });

  it("returns to login when refreshSession throws", async () => {
    mockRefreshSession.mockRejectedValue(new Error("session missing"));

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });

  it("returns to login without checking onboarding when session bootstrap fails", async () => {
    mockRefreshSession.mockResolvedValue({
      hasSession: false,
      me: null,
      nextStep: null,
      postMfaStep: null,
      nextRoute: "/login",
    });

    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });
});
