import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProfilePage } from "../pages/ProfilePage";
import * as api from "@/api";
import { toast } from "sonner";
import { DEFAULT_PLAN_LABEL } from "@/shared/subscriptionTier";

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("@/api", () => ({
  RawExplicitAPI: { list: vi.fn(), patch: vi.fn() },
  PreferencesAPI: { list: vi.fn(), remove: vi.fn(), create: vi.fn() },
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

const authState = {
  user: {
    id: 1,
    supabaseUid: "sb-1",
    name: "Test User",
    email: "test@example.com",
    tier: "Intentional Tier" as string | undefined,
    username: "test",
    createdAt: "",
  },
};

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: authState.user,
    logout: mockLogout,
    updateProfile: mockUpdateProfile,
  }),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = {
      id: 1,
      supabaseUid: "sb-1",
      name: "Test User",
      email: "test@example.com",
      tier: "Intentional Tier",
      username: "test",
      createdAt: "",
    };
    vi.mocked(api.RawExplicitAPI.list).mockResolvedValue([]);
    vi.mocked(api.PreferencesAPI.list).mockResolvedValue([]);
    mockUpdateProfile.mockResolvedValue({ ok: true });
    mockLogout.mockResolvedValue(undefined);
  });

  it("loads and displays profile form", async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.RawExplicitAPI.list).toHaveBeenCalled();
      expect(api.PreferencesAPI.list).toHaveBeenCalled();
    });

    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /financial context/i })).toBeInTheDocument();
    expect(screen.getByText(/App preferences \(key \/ value\)/i)).toBeInTheDocument();
    expect(screen.getByText("Intentional Tier")).toBeInTheDocument();
  });

  it("shows default plan label when user has no tier", async () => {
    authState.user = {
      ...authState.user,
      tier: undefined,
    };
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(api.RawExplicitAPI.list).toHaveBeenCalled());
    expect(screen.getByText(DEFAULT_PLAN_LABEL)).toBeInTheDocument();
  });

  it("shows success toast only after successful profile save", async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValue({ ok: true });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue("Test User")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: "Test User" });
      expect(toast.success).toHaveBeenCalledWith("Profile updated");
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("uses the edited display name for the hero title and initials preview", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue("Test User")).toBeInTheDocument());

    await user.clear(screen.getByDisplayValue("Test User"));
    await user.type(screen.getByPlaceholderText("Your name"), "Morgan Lee");

    expect(screen.getByRole("heading", { name: "Morgan Lee" })).toBeInTheDocument();
    expect(screen.getByText("ML")).toBeInTheDocument();
  });

  it("shows error toast when profile update fails", async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValue({ ok: false, error: "Supabase error" });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue("Test User")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Supabase error");
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("awaits logout before navigating away", async () => {
    const user = userEvent.setup();
    let resolveLogout: () => void = () => {};
    const logoutPromise = new Promise<void>((r) => {
      resolveLogout = r;
    });
    mockLogout.mockReturnValue(logoutPromise);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument());

    const click = user.click(screen.getByRole("button", { name: /Sign out/i }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();

    resolveLogout();
    await click;

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });
});
