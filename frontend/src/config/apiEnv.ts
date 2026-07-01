/**
 * Production URL validation. Local development may use http://127.0.0.1 for the API.
 * Does not replace TLS on the wire; only blocks obviously unsafe production config.
 */

export type ConfiguredUrlValidation = {
  ok: true;
  url: string;
} | {
  ok: false;
  message: string;
};

const NAMED_LOOPBACK_HOST = "local" + "host";

function isLoopbackUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === NAMED_LOOPBACK_HOST || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
  } catch {
    return new RegExp(`${NAMED_LOOPBACK_HOST}|127\\.0\\.0\\.1`, "i").test(url);
  }
}

function validateProductionHttpsUrl(raw: string | undefined, envName: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return `${envName} is required in production. Set it to your HTTPS origin.`;
  }
  if (isLoopbackUrl(trimmed)) {
    return `${envName} must not point to a loopback host in production.`;
  }
  if (trimmed.startsWith("http://")) {
    return `${envName} must use https:// in production.`;
  }
  if (!trimmed.startsWith("https://")) {
    return `${envName} must be a valid https:// URL in production.`;
  }
  return null;
}

/** Strip wrapping quotes from .env (e.g. VITE_API_URL='http://...'). */
function normalizeEnvUrl(raw: string | undefined, fallback: string): string {
  let s = (raw ?? "").trim();
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || fallback;
}

/**
 * Validates API base URL for production builds. Returns error message if invalid.
 */
export function validateProductionApiBaseUrl(raw: string | undefined): string | null {
  return validateProductionHttpsUrl(raw, "VITE_API_URL");
}

function resolveConfiguredUrl(
  raw: string | undefined,
  fallback: string,
  validator: (raw: string | undefined) => string | null
): ConfiguredUrlValidation {
  const value = raw?.trim() || fallback;

  if (import.meta.env.PROD) {
    const err = validator(value);
    if (err) return { ok: false, message: err };
  }

  return { ok: true, url: value };
}

export function getValidatedUrlOrThrow(result: ConfiguredUrlValidation): string {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.url;
}

/**
 * Resolves the API base URL for the current environment.
 */
export function resolveApiBaseUrl(): ConfiguredUrlValidation {
  return resolveConfiguredUrl(
    import.meta.env.VITE_API_URL,
    "http://127.0.0.1:8000",
    validateProductionApiBaseUrl
  );
}
