import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendMessageStream } from "../ai.api";

function sseStream(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function frame(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

describe("sendMessageStream", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("emits deltas in order and resolves with the persisted messages", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: sseStream([
        frame({ type: "delta", text: "Hello" }),
        frame({ type: "delta", text: " world" }),
        frame({
          type: "done",
          user_message: { id: 1, role: "user", content: "hi" },
          assistant_message: { id: 2, role: "assistant", content: "Hello world" },
        }),
      ]),
    } as unknown as Response);

    const deltas: string[] = [];
    const result = await sendMessageStream(7, "hi", { onDelta: (t) => deltas.push(t) });

    expect(deltas).toEqual(["Hello", " world"]);
    expect(result.assistant_message.content).toBe("Hello world");
    expect(result.user_message.id).toBe(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ai\/conversations\/7\/messages\/stream\/$/),
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });

  it("reassembles a delta split across stream chunks", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: sseStream([
        'data: {"type":"delta","text":"Hel',
        'lo"}\n\n',
        frame({
          type: "done",
          user_message: { id: 1, role: "user", content: "hi" },
          assistant_message: { id: 2, role: "assistant", content: "Hello" },
        }),
      ]),
    } as unknown as Response);

    const deltas: string[] = [];
    const result = await sendMessageStream(1, "hi", { onDelta: (t) => deltas.push(t) });

    expect(deltas).toEqual(["Hello"]);
    expect(result.assistant_message.content).toBe("Hello");
  });

  it("throws on an error frame so the caller can fall back", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      body: sseStream([frame({ type: "error", detail: "stream_failed" })]),
    } as unknown as Response);

    await expect(sendMessageStream(1, "hi", { onDelta: () => {} })).rejects.toThrow(/stream_failed/);
  });

  it("throws when the HTTP response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("boom"),
      headers: new Headers(),
    } as unknown as Response);

    await expect(sendMessageStream(1, "hi", { onDelta: () => {} })).rejects.toThrow();
  });
});
