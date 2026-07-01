import { afterEach, describe, expect, it, vi } from "vitest";

type UrlResult = {
  ok: true;
  url: string;
} | {
  ok: false;
  message: string;
};

function mockApiEnv(result: UrlResult) {
  vi.doMock("@/config/apiEnv", () => ({
    resolveApiBaseUrl: () => result,
    getValidatedUrlOrThrow: (value: UrlResult) => {
      if (!value.ok) {
        throw new Error(value.message);
      }
      return value.url;
    },
  }));
}

describe("ai.api TLS configuration", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("throws when validated API config is invalid", async () => {
    mockApiEnv({ ok: false, message: "VITE_API_URL must use https:// in production." });
    vi.doMock("../client", () => ({
      getCsrfToken: () => null,
    }));

    const { createConversation } = await import("../ai.api");

    await expect(createConversation({ context_type: "general" })).rejects.toThrow(
      "VITE_API_URL must use https:// in production."
    );
  });

  it("uses the validated API base URL when config is valid", async () => {
    mockApiEnv({ ok: true, url: "https://api.example.com" });
    vi.doMock("../client", () => ({
      getCsrfToken: () => null,
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ conversation_id: 123 }),
      text: () => Promise.resolve(""),
      headers: new Headers(),
    } as Response));

    const { createConversation } = await import("../ai.api");

    await createConversation({ context_type: "general" });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/ai/conversations/",
      expect.objectContaining({
        method: "POST",
      })
    );
  });
});
