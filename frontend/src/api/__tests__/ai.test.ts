import { describe, it, expect, vi, beforeEach } from "vitest";
import { createConversation, listMessages, sendMessage } from "../ai.api";

describe("ai.api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("createConversation returns conversation_id", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ conversation_id: 123 }),
      text: () => Promise.resolve(""),
      headers: new Headers(),
    } as Response);

    const result = await createConversation(
      { devUsername: "seed_user_0" },
      { context_type: "general" }
    );

    expect(result.conversation_id).toBe(123);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ai\/conversations\/$/),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
    const init = mockFetch.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Dev-User")).toBe("seed_user_0");
    expect(headers.get("Authorization")).toBeNull();
  });

  it("uses session cookies and omits Authorization; X-Dev-User only when passed explicitly", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ conversation_id: 123 }),
      text: () => Promise.resolve(""),
      headers: new Headers(),
    } as Response);

    await createConversation({ context_type: "general" });

    const init = mockFetch.mock.calls[0]?.[1];
    expect(init).toMatchObject({ credentials: "include" });
    const headers = new Headers(init?.headers);

    expect(headers.get("Authorization")).toBeNull();
    expect(headers.has("X-Dev-User")).toBe(false);
  });

  it("sendMessage returns user_message and assistant_message", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          user_message: { id: 1, role: "user", content: "Hello" },
          assistant_message: { id: 2, role: "assistant", content: "Hi there!" },
        }),
      text: () => Promise.resolve(""),
      headers: new Headers(),
    } as Response);

    const result = await sendMessage({ devUsername: "seed_user_0" }, 1, "Hello");

    expect(result).toHaveProperty("user_message");
    expect(result).toHaveProperty("assistant_message");
    expect(result.user_message.content).toBe("Hello");
    expect(result.assistant_message.content).toBe("Hi there!");
  });

  it("sendMessage includes action_payload when provided", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          user_message: { id: 1, role: "user", content: "Confirm" },
          assistant_message: { id: 2, role: "assistant", content: "Updated." },
        }),
      text: () => Promise.resolve(""),
      headers: new Headers(),
    } as Response);

    await sendMessage(1, "Confirm", { kind: "confirm_pending_action" });

    const init = mockFetch.mock.calls[0]?.[1];
    expect(init?.body).toBe(
      JSON.stringify({
        content: "Confirm",
        action_payload: { kind: "confirm_pending_action" },
      })
    );
  });

  it("listMessages returns the ordered messages for a conversation", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          { id: 1, role: "user", content: "Hello" },
          { id: 2, role: "assistant", content: "Hi there!" },
        ]),
      text: () => Promise.resolve(""),
      headers: new Headers(),
    } as Response);

    const result = await listMessages(123);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("includes backend error detail in failed AI requests", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: "Missing or invalid X-Dev-User header" }),
      text: () => Promise.resolve(JSON.stringify({ detail: "Missing or invalid X-Dev-User header" })),
      headers: new Headers(),
    } as Response);

    await expect(createConversation({ context_type: "general" })).rejects.toThrow(
      "createConversation failed: 401 Missing or invalid X-Dev-User header"
    );
  });
});
