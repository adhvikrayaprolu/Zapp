import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerBackendAuditSink, resetBackendAuditSinkForTests } from "../backendSink";
import { emitAuditEvent, resetAuditSinks } from "../audit";
import { getValidatedUrlOrThrow, resolveApiBaseUrl } from "@/config/apiEnv";

describe("backend audit sink", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true } as Response)));
    resetAuditSinks();
    resetBackendAuditSinkForTests();
    document.cookie = "";
  });

  it("posts emitted audit events to the backend endpoint", async () => {
    registerBackendAuditSink();

    emitAuditEvent({
      event_name: "transaction.create",
      outcome: "success",
      source_system: "frontend-web",
      route: "/api/transactions/",
      method: "POST",
    });

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith(
      `${getValidatedUrlOrThrow(resolveApiBaseUrl())}/api/audit/events/`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("includes X-CSRFToken when csrftoken cookie is present", async () => {
    document.cookie = "csrftoken=abc123; path=/";
    registerBackendAuditSink();

    emitAuditEvent({
      event_name: "transaction.update",
      outcome: "failure",
      source_system: "frontend-web",
      route: "/api/transactions/9/",
      method: "PATCH",
    });

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-CSRFToken": "abc123",
        }),
      })
    );
  });
});
