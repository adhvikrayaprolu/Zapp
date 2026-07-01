import { beforeEach, describe, expect, it, vi } from "vitest";

import { TransactionsAPI } from "../transactions.api";
import { apiRequest } from "../client";

vi.mock("../client", () => ({
  apiRequest: vi.fn(),
}));

const tx = (id: number) => ({
  id,
  description_raw: `tx ${id}`,
  occurred_at: "2026-01-01",
  amount: "1.00",
  direction: "spend",
  category: "other",
  impulse_score: null,
  regret_score: null,
  satisfaction_rating: null,
});

describe("transactions.api pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recent() hits the unpaginated limited endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce([tx(1)]);
    await TransactionsAPI.recent(6);
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/transactions/?limit=6",
      expect.objectContaining({ requireAuth: true })
    );
  });

  it("list() follows the cursor and concatenates pages into one array", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        results: [tx(1), tx(2)],
        next: "http://api.test/api/transactions/?cursor=abc",
        previous: null,
      })
      .mockResolvedValueOnce({
        results: [tx(3)],
        next: null,
        previous: "http://api.test/api/transactions/?cursor=prev",
      });

    const result = await TransactionsAPI.list();

    expect(result.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    // Second request follows the relative path extracted from the absolute next URL.
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/transactions/?cursor=abc",
      expect.objectContaining({ requireAuth: true })
    );
  });

  it("list({ limit }) returns the plain array unpaginated in a single request", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce([tx(1), tx(2)]);
    const result = await TransactionsAPI.list({ limit: 6 });
    expect(result.map((t) => t.id)).toEqual([1, 2]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/transactions/?limit=6",
      expect.objectContaining({ requireAuth: true })
    );
  });

  it("list() forwards filters on the first page request", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ results: [], next: null, previous: null });
    await TransactionsAPI.list({ category: "groceries", direction: "spend", date_from: "2026-01-01" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/transactions/?category=groceries&direction=spend&date_from=2026-01-01",
      expect.objectContaining({ requireAuth: true })
    );
  });

  it("listMore() follows an absolute cursor URL as a relative path", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ results: [tx(9)], next: null, previous: null });
    await TransactionsAPI.listMore("https://api.test/api/transactions/?cursor=xyz");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/transactions/?cursor=xyz",
      expect.objectContaining({ requireAuth: true })
    );
  });
});
