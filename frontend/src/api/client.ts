import { getValidatedUrlOrThrow, resolveApiBaseUrl } from "@/config/apiEnv";
import { createRequestId, emitAuditEvent } from "@/shared/audit/audit";

const apiEnvResult = resolveApiBaseUrl();

/** Non-null when production (or misconfigured) API URL is invalid. Surfaces in UI; requests throw. */
export function getApiConfigurationError(): string | null {
  return apiEnvResult.ok ? null : apiEnvResult.message;
}

/** Base URL for first-party API (same origin or configured backend). */
export function getApiBaseUrl(): string {
  return getValidatedUrlOrThrow(apiEnvResult);
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Read Django CSRF cookie (must be readable by JS, not HttpOnly). */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Normalized API failure: safe `message` for UI; `rawBody` for debugging only. */
export class ApiError extends Error {
  readonly status: number;
  readonly rawBody?: string;

  constructor(message: string, status: number, rawBody?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.rawBody = rawBody;
  }
}

function safeMessageForHttpStatus(status: number): string {
  if (status === 400) return "The request could not be processed.";
  if (status === 401) return "Authentication required. Please sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find that resource.";
  if (status === 409) return "This action conflicts with existing data.";
  if (status === 422) return "Please check your input and try again.";
  if (status === 429) return "Too many requests. Please try again later.";
  if (status >= 500) return "Something went wrong on our end. Please try again later.";
  return "Something went wrong. Please try again.";
}

function looksLikeHtml(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || (t.includes("<") && t.includes(">") && t.length > 80);
}

/** Derive a short, user-safe message from JSON error bodies (e.g. DRF). */
function tryParseUserFacingDetail(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || looksLikeHtml(trimmed)) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "string") return parsed.length <= 500 ? parsed : null;

    if (parsed && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      const detail = o.detail;
      if (typeof detail === "string" && detail.length <= 500) return detail;
      if (Array.isArray(detail) && typeof detail[0] === "string") return detail[0];

      for (const v of Object.values(o)) {
        if (Array.isArray(v) && typeof v[0] === "string") return v[0];
        if (typeof v === "string") return v;
      }
    }
  } catch {
    // not JSON
  }

  if (trimmed.length <= 300 && !looksLikeHtml(trimmed)) return trimmed;
  return null;
}

function buildApiError(status: number, rawBody: string): ApiError {
  const detail = tryParseUserFacingDetail(rawBody);
  const message = detail ?? safeMessageForHttpStatus(status);
  return new ApiError(message, status, rawBody || undefined);
}

function shouldSetJsonContentType(body: BodyInit | null | undefined) {
  return body != null && !(body instanceof FormData);
}

function buildRequestHeaders(
  headersInit: HeadersInit | undefined,
  method: string,
  body: BodyInit | null | undefined
) {
  const headers = new Headers(headersInit);

  if (!headers.has("Content-Type") && shouldSetJsonContentType(body)) {
    headers.set("Content-Type", "application/json");
  }

  if (UNSAFE_METHODS.has(method.toUpperCase())) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers.set("X-CSRFToken", csrf);
    }
  }

  return headers;
}

type ApiRequestOptions = RequestInit & {
  /** Semantic only: session auth is cookie-based; 401 still throws ApiError. */
  requireAuth?: boolean;
  audit?:
    | {
        eventName: string;
        action?: string;
        resourceType?: string;
        resourceId?: string | number;
        metadata?: Record<string, unknown>;
        actorId?: string | number | null;
      }
    | undefined;
};

export async function apiRequest<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { requireAuth: _requireAuth = false, audit, ...requestOptions } = options;
  const method = (requestOptions.method ?? "GET").toUpperCase();
  const requestId = createRequestId();
  const actorId = audit?.actorId ?? null;

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestOptions,
      credentials: "include",
      headers: buildRequestHeaders(requestOptions.headers, method, requestOptions.body),
    });
  } catch (error) {
    if (audit) {
      emitAuditEvent({
        event_name: audit.eventName,
        outcome: "failure",
        actor_id: actorId,
        source_system: "frontend-web",
        request_id: requestId,
        action: audit.action,
        resource_type: audit.resourceType,
        resource_id: audit.resourceId,
        route: path,
        method,
        error_code: "network_error",
        error_message: error instanceof Error ? error.message : "Network request failed.",
        metadata: audit.metadata,
      });
    }
    throw error;
  }

  if (!res.ok) {
    const text = await res.text();
    if (audit) {
      const apiError = buildApiError(res.status, text);
      emitAuditEvent({
        event_name: audit.eventName,
        outcome: "failure",
        actor_id: actorId,
        source_system: "frontend-web",
        request_id: requestId,
        action: audit.action,
        resource_type: audit.resourceType,
        resource_id: audit.resourceId,
        route: path,
        method,
        status_code: res.status,
        error_message: apiError.message,
        metadata: audit.metadata,
      });
    }
    throw buildApiError(res.status, text);
  }

  if (audit) {
    emitAuditEvent({
      event_name: audit.eventName,
      outcome: "success",
      actor_id: actorId,
      source_system: "frontend-web",
      request_id: requestId,
      action: audit.action,
      resource_type: audit.resourceType,
      resource_id: audit.resourceId,
      route: path,
      method,
      status_code: res.status,
      metadata: audit.metadata,
    });
  }

  if (res.status === 204 || res.status === 205) return null as T;

  const text = await res.text();
  if (!text) return null as T;

  const contentType = res.headers.get("Content-Type") ?? "";
  const expectsJson = contentType.includes("application/json") || contentType.includes("+json");
  if (expectsJson) {
    return JSON.parse(text) as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

/** DRF-style paginated response. */
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type PaginatedParams = {
  page?: number;
  page_size?: number;
};

/** Fetches paginated endpoint and returns results array. Handles both paginated and plain array responses. */
export async function apiRequestPaginated<T>(
  path: string,
  params?: PaginatedParams,
  options: ApiRequestOptions = {}
): Promise<T[]> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.page_size != null) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  const fullPath = path + (qs ? (path.includes("?") ? "&" : "?") + qs : "");
  const data = await apiRequest<PaginatedResponse<T> | T[]>(fullPath, options);
  if (Array.isArray(data)) return data;
  return (data as PaginatedResponse<T>).results ?? [];
}
