/**
 * Frontend URL Spotify OAuth should return to after backend completes the flow.
 * Backend must whitelist this URL; defaults to same-origin callback route.
 */
export function getSpotifyOAuthReturnUrl(): string {
  const fromEnv = import.meta.env.VITE_SPOTIFY_OAUTH_RETURN_URL?.trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/integrations/spotify/callback`;
  }
  return "";
}
