import { apiRequest } from "./client";

const auth = { requireAuth: true as const };

/** POST /api/integrations/spotify/connect/ */
export type SpotifyConnectResponse = {
  /** Full URL to open for Spotify OAuth (backend-issued). */
  authorization_url?: string;
  /** Alternative key some backends use. */
  redirect_url?: string;
  url?: string;
  /** Django-style key used by some backends (same as authorization_url). */
  auth_url?: string;
};

/** GET /api/integrations/spotify/status/ */
export type SpotifyConnectionStatus = {
  connected: boolean;
  display_name?: string | null;
  country?: string | null;
  /** Spotify product / account type, e.g. premium, free */
  product?: string | null;
  scopes?: string[];
  /** ISO timestamp of last successful sync */
  last_synced_at?: string | null;
  /** High-level sync lifecycle */
  sync_status?: "idle" | "syncing" | "pending" | "error" | "reconnect_required" | string;
  /** Connection health hint from backend */
  health?: "ok" | "warning" | "error" | string;
  /** Human-readable status or error detail */
  message?: string | null;
  /** True when token expired or revoked */
  requires_reconnect?: boolean;
};

/** POST /api/integrations/spotify/sync/ */
export type SpotifySyncResponse = {
  ok?: boolean;
  status?: string;
  detail?: string;
  message?: string;
};

/** DELETE /api/integrations/spotify/disconnect/ */
export type SpotifyDisconnectResponse = {
  ok?: boolean;
  detail?: string;
};

/** GET /api/integrations/spotify/insights/ (optional) */
export type SpotifyInsights = {
  active_listening_days?: number | null;
  recent_usage_trend?: "up" | "down" | "flat" | string | null;
  estimated_utilization?: number | null;
  cost_per_active_day?: number | null;
  /** Free-form summary line */
  summary?: string | null;
};

function pickAuthUrl(data: SpotifyConnectResponse): string | null {
  return data.authorization_url ?? data.redirect_url ?? data.url ?? data.auth_url ?? null;
}

export const SpotifyIntegrationAPI = {
  getStatus: (opts?: { signal?: AbortSignal }) =>
    apiRequest<SpotifyConnectionStatus>("/api/integrations/spotify/status/", {
      ...auth,
      signal: opts?.signal,
    }),

  /**
   * Starts OAuth: backend returns a browser URL. Caller should assign `window.location.href`.
   * Optional body includes frontend return URL so backend can redirect after callback.
   */
  connect: (body?: { redirect_after?: string }) =>
    apiRequest<SpotifyConnectResponse>("/api/integrations/spotify/connect/", {
      ...auth,
      method: "POST",
      body: body && Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    }),

  sync: () =>
    apiRequest<SpotifySyncResponse>("/api/integrations/spotify/sync/", {
      ...auth,
      method: "POST",
      body: JSON.stringify({}),
    }),

  disconnect: () =>
    apiRequest<SpotifyDisconnectResponse>("/api/integrations/spotify/disconnect/", {
      ...auth,
      method: "DELETE",
    }),

  getInsights: async (opts?: { signal?: AbortSignal }): Promise<SpotifyInsights | null> => {
    try {
      return await apiRequest<SpotifyInsights>("/api/integrations/spotify/insights/", {
        ...auth,
        signal: opts?.signal,
      });
    } catch {
      return null;
    }
  },

  /** Resolve authorize URL from connect response (throws if missing). */
  resolveAuthorizationUrl(data: SpotifyConnectResponse): string {
    const url = pickAuthUrl(data);
    if (!url) {
      throw new Error("Connect response did not include an authorization URL.");
    }
    return url;
  },
};
