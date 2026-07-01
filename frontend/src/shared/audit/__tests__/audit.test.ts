import { describe, it, expect, beforeEach } from "vitest";
import { addAuditSink, emitAuditEvent, resetAuditSinks, type AuditEvent } from "../audit";

describe("audit", () => {
  let events: AuditEvent[] = [];

  beforeEach(() => {
    events = [];
    resetAuditSinks();
    addAuditSink((event) => {
      events.push(event);
    });
  });

  it("redacts sensitive metadata fields", () => {
    emitAuditEvent({
      event_name: "auth.login",
      outcome: "failure",
      actor_id: null,
      source_system: "frontend-web",
      metadata: {
        password: "secret12",
        public_token: "public-token",
        nested: {
          access_token: "token",
        },
        safe_key: "safe",
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0].metadata).toEqual({
      password: "[REDACTED]",
      public_token: "[REDACTED]",
      nested: {
        access_token: "[REDACTED]",
      },
      safe_key: "safe",
    });
  });
});
