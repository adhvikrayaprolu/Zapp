import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionsAPI } from "../subscriptions.api";
import { apiRequest } from "../client";

vi.mock("../client", () => ({
  apiRequest: vi.fn(),
}));

describe("subscriptions.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list calls GET /api/subscriptions/", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce([]);

    const result = await SubscriptionsAPI.list();

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/subscriptions/",
      expect.objectContaining({
        requireAuth: true,
      })
    );
    expect(result).toEqual([]);
  });

  it("create sends backend-compatible payload and normalizes response", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      id: 1,
      merchant: 1,
      price: 9.99,
      billing_cycle: "monthly",
      status: "active",
      started_on: "2025-01-01",
      feedback_value_score: 0.82,
    });

    const result = await SubscriptionsAPI.create({
      merchant: 1,
      amount: 9.99,
      billing_cycle: "monthly",
      status: "active",
      started_at: "2025-01-01T00:00:00Z",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/subscriptions/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          merchant: 1,
          price: 9.99,
          billing_cycle: "monthly",
          status: "active",
          started_on: "2025-01-01",
        }),
        requireAuth: true,
      })
    );
    expect(result).toEqual({
      id: 1,
      merchant: 1,
      amount: 9.99,
      billing_cycle: "monthly",
      status: "active",
      started_at: "2025-01-01T00:00:00Z",
      notes: undefined,
      value_score: 0.82,
    });
  });

  it("remove calls DELETE /api/subscriptions/{id}/", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(null);

    await SubscriptionsAPI.remove(42);

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/subscriptions/42/",
      expect.objectContaining({
        method: "DELETE",
        requireAuth: true,
      })
    );
  });
});
