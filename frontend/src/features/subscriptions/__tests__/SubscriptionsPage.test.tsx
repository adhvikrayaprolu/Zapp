import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SubscriptionsPage } from "../pages/SubscriptionsPage";
import { PanelProvider } from "@/features/dashboard/context/PanelContext";
import * as api from "@/api";

vi.mock("@/api", () => ({
  SubscriptionsAPI: { list: vi.fn(), remove: vi.fn(), create: vi.fn() },
  MerchantsAPI: { list: vi.fn() },
  SubscriptionValuationsAPI: { list: vi.fn() },
}));

vi.mock("@/api/spotifyIntegration.api", () => ({
  SpotifyIntegrationAPI: {
    getStatus: vi.fn().mockResolvedValue({ connected: false }),
    getInsights: vi.fn().mockResolvedValue(null),
    connect: vi.fn(),
    sync: vi.fn(),
    disconnect: vi.fn(),
    resolveAuthorizationUrl: vi.fn(),
  },
}));

vi.mock("@/config/spotifyIntegration", () => ({
  getSpotifyOAuthReturnUrl: () => "http://localhost/integrations/spotify/callback",
}));

function renderSubscriptions() {
  return render(
    <MemoryRouter>
      <PanelProvider>
        <SubscriptionsPage />
      </PanelProvider>
    </MemoryRouter>
  );
}

async function expectValueScore(score: number) {
  await waitFor(() => {
    expect(screen.getAllByText(new RegExp(`^${score}$`)).length).toBeGreaterThan(0);
  });

  expect(
    screen
      .getAllByRole("progressbar")
      .find((meter) => meter.getAttribute("aria-valuenow") === String(score))
  ).toBeDefined();
}

describe("SubscriptionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.SubscriptionsAPI.list).mockResolvedValue([]);
    vi.mocked(api.MerchantsAPI.list).mockResolvedValue([
      { id: 1, name: "Netflix", category: "streaming" },
    ]);
    vi.mocked(api.SubscriptionValuationsAPI.list).mockResolvedValue([]);
  });

  it("loads and displays empty state when no subscriptions", async () => {
    renderSubscriptions();

    await waitFor(() => {
      expect(api.SubscriptionsAPI.list).toHaveBeenCalled();
      expect(api.MerchantsAPI.list).toHaveBeenCalled();
    });

    expect(screen.getByRole("heading", { name: /spotify/i })).toBeInTheDocument();
    expect(screen.getByText(/No subscriptions yet/i)).toBeInTheDocument();
  });

  it("displays subscriptions when data is loaded", async () => {
    vi.mocked(api.SubscriptionsAPI.list).mockResolvedValue([
      {
        id: 1,
        merchant: 1,
        merchant_name: "Netflix",
        amount: 15.99,
        billing_cycle: "monthly",
        status: "active",
        started_at: "2025-01-01",
      },
    ]);

    renderSubscriptions();

    await waitFor(() => {
      expect(screen.getByText("Netflix")).toBeInTheDocument();
    });

    expect(screen.getByText("$15.99")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add subscription/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update value scores/i })).toBeInTheDocument();
  });

  it("renders subscription value scores with the transaction-style display", async () => {
    vi.mocked(api.SubscriptionsAPI.list).mockResolvedValue([
      {
        id: 1,
        merchant: 1,
        merchant_name: "Netflix",
        amount: 15.99,
        billing_cycle: "monthly",
        status: "active",
        started_at: "2025-01-01",
        value_score: 100,
      },
    ]);

    renderSubscriptions();

    await expectValueScore(100);
  });

  it("normalizes fractional subscription feedback scores before display", async () => {
    vi.mocked(api.SubscriptionsAPI.list).mockResolvedValue([
      {
        id: 1,
        merchant: 1,
        merchant_name: "Netflix",
        amount: 15.99,
        billing_cycle: "monthly",
        status: "active",
        started_at: "2025-01-01",
        value_score: 0.82,
      },
    ]);

    renderSubscriptions();

    await expectValueScore(123);
  });

  it("prefers subscription valuation scores when available", async () => {
    vi.mocked(api.SubscriptionsAPI.list).mockResolvedValue([
      {
        id: 1,
        merchant: 1,
        merchant_name: "Netflix",
        amount: 15.99,
        billing_cycle: "monthly",
        status: "active",
        started_at: "2025-01-01",
        value_score: 0.82,
      },
    ]);
    vi.mocked(api.SubscriptionValuationsAPI.list).mockResolvedValue([
      {
        id: 10,
        subscription: 1,
        personal_value_score: 120,
        recommendation: "Keep it",
      },
    ]);

    renderSubscriptions();

    await expectValueScore(120);
  });

  it("still shows subscriptions when valuations fail to load", async () => {
    vi.mocked(api.SubscriptionsAPI.list).mockResolvedValue([
      {
        id: 1,
        merchant: 1,
        merchant_name: "Netflix",
        amount: 15.99,
        billing_cycle: "monthly",
        status: "active",
        started_at: "2025-01-01",
      },
    ]);
    vi.mocked(api.SubscriptionValuationsAPI.list).mockRejectedValue(new Error("valuations unavailable"));

    renderSubscriptions();

    await waitFor(() => {
      expect(screen.getByText("Netflix")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("renders a retry notice when subscriptions fail to load", async () => {
    vi.mocked(api.SubscriptionsAPI.list).mockRejectedValue(new Error("catalog offline"));

    renderSubscriptions();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("catalog offline");
    });

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
