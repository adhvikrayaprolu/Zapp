import { describe, it, expect, vi, beforeEach } from "vitest";
import { RawExplicitAPI, PreferencesAPI } from "../users.api";
import { apiRequest } from "../client";

vi.mock("../client", () => ({
  apiRequest: vi.fn(),
}));

describe("users.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RawExplicitAPI.list calls GET /api/raw-explicit/ with requireAuth", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce([]);

    await RawExplicitAPI.list();

    expect(apiRequest).toHaveBeenCalledWith("/api/raw-explicit/", {
      requireAuth: true,
    });
  });

  it("PreferencesAPI.create sends correct payload", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      id: 1,
      key: "theme",
      value: "dark",
      value_type: "string",
    });

    await PreferencesAPI.create({
      key: "theme",
      value: "dark",
      value_type: "string",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/preferences/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "theme", value: "dark", value_type: "string" }),
        requireAuth: true,
      })
    );
  });
});
