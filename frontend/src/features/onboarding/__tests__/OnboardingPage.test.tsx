import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingAPI } from "@/api/onboarding.api";
import { OnboardingPage } from "../pages/OnboardingPage";

const mockNavigate = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    isAuthReady: true,
    isAuthenticated: true,
    nextStep: "onboarding_survey",
    nextRoute: "/onboarding",
    refreshSession: mockRefreshSession,
  }),
}));

vi.mock("@/api/onboarding.api", () => ({
  OnboardingAPI: { skip: vi.fn(), submit: vi.fn() },
}));

vi.mock("@/shared/components/brand/AppLogo", () => ({ AppLogo: () => null }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(OnboardingAPI.skip).mockResolvedValue({} as never);
    mockRefreshSession.mockResolvedValue({ nextRoute: "/" });
  });

  it("'Skip for now' saves an empty profile and leaves onboarding (issue #2)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /skip for now/i }));

    await waitFor(() => {
      expect(OnboardingAPI.skip).toHaveBeenCalledTimes(1);
      expect(mockRefreshSession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
    expect(OnboardingAPI.submit).not.toHaveBeenCalled();
  });
});
