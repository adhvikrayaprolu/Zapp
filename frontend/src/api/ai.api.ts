import { getValidatedUrlOrThrow, resolveApiBaseUrl } from "@/config/apiEnv";
import { getCsrfToken } from "./client";

const apiEnvResult = resolveApiBaseUrl();

function getAiBaseUrl(): string {
  return getValidatedUrlOrThrow(apiEnvResult);
}

export type ApiMessage = {
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  metadata_json?: Record<string, unknown>;
};

export type AiQuickAction = {
  label: string;
  route?: string;
  action_payload?: Record<string, unknown>;
  reason?: string;
};

export type AiAssistantMetadata = {
  action?: string;
  action_status?: string;
  created_transaction_id?: number | null;
  quick_actions?: AiQuickAction[];
  intent_detection?: {
    intent?: string;
    confidence?: number;
  };
};

async function readAiError(res: Response, fallbackMessage: string) {
  const text = (await res.text()).trim();

  if (!text) {
    return `${fallbackMessage}: ${res.status}`;
  }

  try {
    const parsed = JSON.parse(text) as { detail?: string };
    if (typeof parsed.detail === "string" && parsed.detail) {
      return `${fallbackMessage}: ${res.status} ${parsed.detail}`;
    }
  } catch {
    // Use the raw response body below.
  }

  return `${fallbackMessage}: ${res.status} ${text}`;
}

type DevAuthParams = {
  devUsername?: string;
};

type CreateConversationParams = {
  context_type?: string;
  title?: string;
  linked_subscription?: number;
  linked_item_valuation?: number;
};

function resolveDevUsername(auth?: DevAuthParams) {
  return auth?.devUsername?.trim() ?? null;
}

function buildAiHeaders(auth?: DevAuthParams, body?: BodyInit | null, method = "GET") {
  const headers: Record<string, string> = {};

  if (body != null && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const upper = method.toUpperCase();
  if (upper === "POST" || upper === "PUT" || upper === "PATCH" || upper === "DELETE") {
    const csrf = getCsrfToken();
    if (csrf) {
      headers["X-CSRFToken"] = csrf;
    }
  }

  const devUsername = resolveDevUsername(auth);
  if (devUsername) {
    headers["X-Dev-User"] = devUsername;
  }

  return headers;
}

function mergeHeaders(
  baseHeaders: Record<string, string>,
  extraHeaders: HeadersInit | undefined
) {
  if (!extraHeaders) {
    return baseHeaders;
  }

  const merged = { ...baseHeaders };
  const normalizedHeaders = new Headers(extraHeaders);

  normalizedHeaders.forEach((value, key) => {
    const existingKey = Object.keys(merged).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase()
    );
    merged[existingKey ?? key] = value;
  });

  return merged;
}

function isDevAuthParams(value: unknown): value is DevAuthParams {
  return !!value && typeof value === "object" && "devUsername" in value;
}

async function aiRequest<T>(
  path: string,
  fallbackMessage: string,
  options: RequestInit = {},
  auth?: DevAuthParams
) {
  const method = options.method ?? "GET";
  const res = await fetch(`${getAiBaseUrl()}${path}`, {
    ...options,
    credentials: "include",
    headers: mergeHeaders(buildAiHeaders(auth, options.body, method), options.headers),
  });

  if (!res.ok) {
    throw new Error(await readAiError(res, fallbackMessage));
  }

  return (await res.json()) as T;
}

export async function createConversation(
  auth: DevAuthParams,
  params?: CreateConversationParams
): Promise<{ conversation_id: number }>;
export async function createConversation(
  params?: CreateConversationParams
): Promise<{ conversation_id: number }>;
export async function createConversation(
  authOrParams?: DevAuthParams | CreateConversationParams,
  maybeParams?: CreateConversationParams
) {
  const auth = isDevAuthParams(authOrParams) ? authOrParams : undefined;
  const params = isDevAuthParams(authOrParams) ? maybeParams : authOrParams;

  return aiRequest<{ conversation_id: number }>(
    "/api/ai/conversations/",
    "createConversation failed",
    {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    },
    auth
  );
}

export async function sendMessage(
  auth: DevAuthParams,
  conversationId: number,
  content: string,
  actionPayload?: Record<string, unknown>
): Promise<{
  user_message: ApiMessage;
  assistant_message: ApiMessage & { metadata_json?: AiAssistantMetadata };
}>;
export async function sendMessage(
  conversationId: number,
  content: string,
  actionPayload?: Record<string, unknown>
): Promise<{
  user_message: ApiMessage;
  assistant_message: ApiMessage & { metadata_json?: AiAssistantMetadata };
}>;
export async function sendMessage(
  authOrConversationId: DevAuthParams | number,
  conversationIdOrContent: number | string,
  contentOrActionPayload?: string | Record<string, unknown>,
  maybeActionPayload?: Record<string, unknown>
) {
  const auth =
    typeof authOrConversationId === "number" ? undefined : authOrConversationId;
  const conversationId =
    typeof authOrConversationId === "number"
      ? authOrConversationId
      : (conversationIdOrContent as number);
  const content =
    typeof authOrConversationId === "number"
      ? (conversationIdOrContent as string)
      : (contentOrActionPayload as string);
  const actionPayload =
    typeof authOrConversationId === "number"
      ? (contentOrActionPayload as Record<string, unknown> | undefined)
      : maybeActionPayload;
  const requestBody = actionPayload
    ? { content, action_payload: actionPayload }
    : { content };

  return aiRequest<{
    user_message: ApiMessage;
    assistant_message: ApiMessage & { metadata_json?: AiAssistantMetadata };
  }>(
    `/api/ai/conversations/${conversationId}/messages/`,
    "sendMessage failed",
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    },
    auth
  );
}

export type StreamMessageResult = {
  user_message: ApiMessage;
  assistant_message: ApiMessage & { metadata_json?: AiAssistantMetadata };
};

/**
 * Stream an assistant reply via Server-Sent Events. Calls `onDelta` for each
 * text chunk as it arrives and resolves with the persisted
 * { user_message, assistant_message } from the final `done` frame.
 *
 * Throws on HTTP error, an `error` frame, a missing response body (streaming
 * unsupported), or abort — so callers can fall back to `sendMessage`. Auth
 * matches the non-streaming path (session cookie + CSRF + optional dev header);
 * we use fetch + ReadableStream rather than EventSource because EventSource
 * cannot send a POST body or the CSRF header.
 */
export async function sendMessageStream(
  conversationId: number,
  content: string,
  options: {
    onDelta: (text: string) => void;
    actionPayload?: Record<string, unknown>;
    signal?: AbortSignal;
    auth?: DevAuthParams;
  }
): Promise<StreamMessageResult> {
  const body = JSON.stringify(
    options.actionPayload ? { content, action_payload: options.actionPayload } : { content }
  );

  const res = await fetch(
    `${getAiBaseUrl()}/api/ai/conversations/${conversationId}/messages/stream/`,
    {
      method: "POST",
      credentials: "include",
      headers: mergeHeaders(buildAiHeaders(options.auth, body, "POST"), {
        Accept: "text/event-stream",
      }),
      body,
      signal: options.signal,
    }
  );

  if (!res.ok) {
    throw new Error(await readAiError(res, "sendMessageStream failed"));
  }
  if (!res.body) {
    throw new Error("sendMessageStream failed: streaming not supported");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: StreamMessageResult | null = null;
  let streamError: string | null = null;

  const handleFrame = (frame: string) => {
    const dataLine = frame
      .split("\n")
      .map((line) => line.trimStart())
      .find((line) => line.startsWith("data:"));
    if (!dataLine) return;

    const json = dataLine.slice("data:".length).trim();
    if (!json) return;

    let event: {
      type?: string;
      text?: string;
      user_message?: ApiMessage;
      assistant_message?: ApiMessage & { metadata_json?: AiAssistantMetadata };
      detail?: string;
    };
    try {
      event = JSON.parse(json);
    } catch {
      return;
    }

    if (event.type === "delta" && typeof event.text === "string") {
      options.onDelta(event.text);
    } else if (event.type === "done" && event.user_message && event.assistant_message) {
      result = { user_message: event.user_message, assistant_message: event.assistant_message };
    } else if (event.type === "error") {
      streamError = event.detail || "stream_failed";
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const frame = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      handleFrame(frame);
      separator = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim()) handleFrame(buffer);

  if (streamError) throw new Error(`sendMessageStream failed: ${streamError}`);
  if (!result) throw new Error("sendMessageStream failed: stream ended without a final message");
  return result;
}

export async function listMessages(
  auth: DevAuthParams,
  conversationId: number
): Promise<ApiMessage[]>;
export async function listMessages(conversationId: number): Promise<ApiMessage[]>;
export async function listMessages(
  authOrConversationId: DevAuthParams | number,
  maybeConversationId?: number
) {
  const auth =
    typeof authOrConversationId === "number" ? undefined : authOrConversationId;
  const conversationId =
    typeof authOrConversationId === "number"
      ? authOrConversationId
      : maybeConversationId;

  return aiRequest<ApiMessage[]>(
    `/api/ai/conversations/${conversationId}/messages/`,
    "listMessages failed",
    undefined,
    auth
  );
}
