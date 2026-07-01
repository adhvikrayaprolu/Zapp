import { describe, it, expect, vi, beforeEach } from "vitest";
import { BankingAPI } from "../banking.api";
import { apiRequest } from "../client";

vi.mock("../client", () => ({
  apiRequest: vi.fn(),
}));

describe("banking.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createLinkToken calls POST /api/banking/link-token/", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ link_token: "link-sandbox-abc123" });

    const result = await BankingAPI.createLinkToken();

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/banking/link-token/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
        requireAuth: true,
      })
    );
    expect(result).toEqual({ link_token: "link-sandbox-abc123" });
  });

  it("exchangePublicToken calls POST /api/banking/exchange-token/ with public_token", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      success: true,
      connection: { id: "conn-1", institution_name: "Chase", status: "active" },
    });

    await BankingAPI.exchangePublicToken("public-sandbox-xyz789");

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/banking/exchange-token/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ public_token: "public-sandbox-xyz789" }),
        requireAuth: true,
      })
    );
  });

  it("getConnections calls GET /api/banking/connections/", async () => {
    const connections = [
      { id: "conn-1", institution_name: "Chase", status: "active", last_synced_at: "2025-01-01T00:00:00Z" },
    ];
    vi.mocked(apiRequest).mockResolvedValueOnce(connections);

    const result = await BankingAPI.getConnections();

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/banking/connections/",
      expect.objectContaining({
        requireAuth: true,
      })
    );
    expect(result).toEqual(connections);
  });

  it("getAccounts calls GET /api/banking/accounts/", async () => {
    const accounts = [
      { id: "acc-1", name: "Checking", type: "depository", subtype: "checking", mask: "1234", current_balance: 1000 },
    ];
    vi.mocked(apiRequest).mockResolvedValueOnce(accounts);

    const result = await BankingAPI.getAccounts();

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/banking/accounts/",
      expect.objectContaining({
        requireAuth: true,
      })
    );
    expect(result).toEqual(accounts);
  });

  it("getTransactions calls GET /api/banking/transactions/ with optional params", async () => {
    const transactions = [
      { id: "tx-1", amount: "-10.50", name: "Coffee Shop", date: "2025-01-15" },
    ];
    vi.mocked(apiRequest).mockResolvedValueOnce(transactions);

    await BankingAPI.getTransactions({
      limit: 20,
      date_from: "2025-01-01",
      date_to: "2025-01-31",
      category: "food",
      direction: "spend",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/banking/transactions/?limit=20&date_from=2025-01-01&date_to=2025-01-31&category=food&direction=spend",
      expect.objectContaining({ requireAuth: true })
    );
  });

  it("syncConnection calls POST /api/banking/connections/{id}/sync/", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ ok: true });

    await BankingAPI.syncConnection("conn-123");

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/banking/connections/conn-123/sync/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
        requireAuth: true,
      })
    );
  });
});
