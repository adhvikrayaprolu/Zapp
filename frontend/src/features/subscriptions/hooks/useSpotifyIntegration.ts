import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import {
  SpotifyIntegrationAPI,
  type SpotifyConnectionStatus,
  type SpotifyInsights,
} from "@/api/spotifyIntegration.api";
import { getSpotifyOAuthReturnUrl } from "@/config/spotifyIntegration";

function messageFromUnknown(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useSpotifyIntegration() {
  const [searchParams] = useSearchParams();
  const spotifyQuery = searchParams.get("spotify");

  const [status, setStatus] = React.useState<SpotifyConnectionStatus | null>(null);
  const [insights, setInsights] = React.useState<SpotifyInsights | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await SpotifyIntegrationAPI.getStatus();
      setStatus(s);
      if (s.connected) {
        const ins = await SpotifyIntegrationAPI.getInsights();
        setInsights(ins);
      } else {
        setInsights(null);
      }
    } catch (e) {
      setStatus(null);
      setInsights(null);
      setError(messageFromUnknown(e, "Could not load Spotify connection status."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, spotifyQuery]);

  const connect = React.useCallback(async () => {
    setActionLoading(true);
    try {
      const returnUrl = getSpotifyOAuthReturnUrl();
      const data = await SpotifyIntegrationAPI.connect(
        returnUrl ? { redirect_after: returnUrl } : undefined
      );
      const url = SpotifyIntegrationAPI.resolveAuthorizationUrl(data);
      window.location.assign(url);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Could not start Spotify connection."));
    } finally {
      setActionLoading(false);
    }
  }, []);

  const sync = React.useCallback(async () => {
    setActionLoading(true);
    try {
      await SpotifyIntegrationAPI.sync();
      toast.success("Spotify sync started.");
      await load();
    } catch (e) {
      toast.error(messageFromUnknown(e, "Sync failed."));
    } finally {
      setActionLoading(false);
    }
  }, [load]);

  const disconnect = React.useCallback(async () => {
    if (!window.confirm("Disconnect Spotify? Subscription insights from Spotify will stop updating.")) return;
    setActionLoading(true);
    try {
      await SpotifyIntegrationAPI.disconnect();
      toast.success("Spotify disconnected.");
      setStatus((prev) => ({ ...(prev ?? { connected: false }), connected: false }));
      setInsights(null);
      await load();
    } catch (e) {
      toast.error(messageFromUnknown(e, "Could not disconnect Spotify."));
    } finally {
      setActionLoading(false);
    }
  }, [load]);

  return {
    status,
    insights,
    loading,
    actionLoading,
    error,
    reload: load,
    connect,
    sync,
    disconnect,
  };
}
