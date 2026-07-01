import { describe, it, expect, vi, beforeEach } from "vitest";
import { SpotifyIntegrationAPI } from "../spotifyIntegration.api";
import { apiRequest } from "../client";

vi.mock("../client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../client")>();
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

describe("spotifyIntegration.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStatus calls GET /api/integrations/spotify/status/", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ connected: false });
    await SpotifyIntegrationAPI.getStatus();
    expect(apiRequest).toHaveBeenCalledWith("/api/integrations/spotify/status/", { requireAuth: true });
  });

  it("connect posts to /api/integrations/spotify/connect/", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ authorization_url: "https://accounts.spotify.com/authorize?x=1" });
    const r = await SpotifyIntegrationAPI.connect({ redirect_after: "http://localhost/cb" });
    expect(r.authorization_url).toContain("spotify");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/integrations/spotify/connect/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ redirect_after: "http://localhost/cb" }),
        requireAuth: true,
      })
    );
  });

  it("resolveAuthorizationUrl prefers authorization_url", () => {
    expect(
      SpotifyIntegrationAPI.resolveAuthorizationUrl({
        authorization_url: "https://a.example",
        redirect_url: "https://b.example",
      })
    ).toBe("https://a.example");
  });

  it("resolveAuthorizationUrl uses auth_url when other keys absent (Django)", () => {
    const url = "https://accounts.spotify.com/authorize?client_id=x";
    expect(SpotifyIntegrationAPI.resolveAuthorizationUrl({ auth_url: url })).toBe(url);
  });

  it("sync posts to /api/integrations/spotify/sync/", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ ok: true });
    await SpotifyIntegrationAPI.sync();
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/integrations/spotify/sync/",
      expect.objectContaining({ method: "POST", requireAuth: true })
    );
  });

  it("disconnect DELETEs /api/integrations/spotify/disconnect/", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ ok: true });
    await SpotifyIntegrationAPI.disconnect();
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/integrations/spotify/disconnect/",
      expect.objectContaining({ method: "DELETE", requireAuth: true })
    );
  });
});
