export type AuditOutcome = "attempt" | "success" | "failure";

export type AuditEvent = {
  event_name: string;
  occurred_at: string;
  outcome: AuditOutcome;
  actor_id?: string | number | null;
  actor_type: "user" | "anonymous" | "system";
  source_system: string;
  request_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string | number;
  route?: string;
  method?: string;
  status_code?: number;
  error_code?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
};

export type AuditSink = (event: AuditEvent) => void;

const REDACTED = "[REDACTED]";
const REDACT_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "session",
  "access_token",
  "refresh_token",
  "public_token",
  "consent_text",
  "content",
  "reflection_text",
];

function nowIso() {
  return new Date().toISOString();
}

function isRedactedKey(key: string) {
  const normalized = key.toLowerCase();
  return REDACT_KEYS.some((candidate) => normalized.includes(candidate));
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > 4) return "[Truncated]";
  if (typeof value === "string") {
    return value.length > 256 ? `${value.slice(0, 256)}...[truncated]` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = isRedactedKey(key) ? REDACTED : sanitizeValue(nestedValue, depth + 1);
    }
    return sanitized;
  }
  return value;
}

function defaultSink(event: AuditEvent) {
  console.info("[audit]", event);
}

const sinks = new Set<AuditSink>([defaultSink]);

function resolveActorType(actorId: AuditEvent["actor_id"]) {
  return actorId == null ? "anonymous" : "user";
}

export function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function emitAuditEvent(event: Omit<AuditEvent, "occurred_at" | "actor_type">) {
  const normalized: AuditEvent = {
    ...event,
    occurred_at: nowIso(),
    actor_type: resolveActorType(event.actor_id),
    metadata: event.metadata ? (sanitizeValue(event.metadata) as Record<string, unknown>) : undefined,
    error_message: event.error_message ? String(sanitizeValue(event.error_message)) : undefined,
  };

  for (const sink of sinks) {
    sink(normalized);
  }
}

export function addAuditSink(sink: AuditSink) {
  sinks.add(sink);
  return () => {
    sinks.delete(sink);
  };
}

export function resetAuditSinks() {
  sinks.clear();
  sinks.add(defaultSink);
}
