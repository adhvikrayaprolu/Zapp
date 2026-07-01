import { describe, expect, it } from "vitest";
import {
  buildFallbackAssistantMessage,
  mapApiMessageToChatMessage,
  normalizeQuickActionRoute,
} from "../zappBot.helpers";

describe("zappBot.helpers", () => {
  it("normalizes backend quick action routes that do not exist in the frontend router", () => {
    expect(normalizeQuickActionRoute("/transactions/new/")).toBe("/transactions/new");
    expect(normalizeQuickActionRoute("/valuations/new")).toBe("/analytics?tab=valuations&create=item");
  });

  it("maps backend messages into chat messages with normalized quick actions", () => {
    const message = mapApiMessageToChatMessage({
      id: 42,
      role: "assistant",
      content: "Choose an action",
      created_at: "2026-03-28T15:30:00Z",
      metadata_json: {
        quick_actions: [
          { label: "Add Transaction", route: "/transactions/new/" },
          { label: "Add Item Valuation", route: "/valuations/new" },
        ],
      },
    });

    expect(message).toEqual({
      id: "42",
      text: "Choose an action",
      sender: "assistant",
      timestamp: new Date("2026-03-28T15:30:00Z"),
      quickActions: [
        { label: "Add Transaction", route: "/transactions/new" },
        { label: "Add Item Valuation", route: "/analytics?tab=valuations&create=item" },
      ],
    });
  });

  it("preserves backend chat-action quick actions", () => {
    const message = mapApiMessageToChatMessage({
      id: 43,
      role: "assistant",
      content: "Confirm the update",
      created_at: "2026-03-28T15:31:00Z",
      metadata_json: {
        quick_actions: [
          { label: "Confirm", action_payload: { kind: "confirm_pending_action" } },
        ],
      },
    });

    expect(message?.quickActions).toEqual([
      { label: "Confirm", action_payload: { kind: "confirm_pending_action" } },
    ]);
  });

  it("creates a fallback greeting that is always shown as an assistant message", () => {
    const message = buildFallbackAssistantMessage();

    expect(message.sender).toBe("assistant");
    expect(message.text).toContain("ZappBot");
  });
});
