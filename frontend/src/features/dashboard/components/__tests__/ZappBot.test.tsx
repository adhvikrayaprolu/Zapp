import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ZappBot } from "../ZappBot";
import * as aiApi from "@/api/ai.api";

vi.mock("@/api/ai.api", () => ({
  createConversation: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: {
      supabaseUid: "uid-123",
      username: "tester",
    },
  }),
}));

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("ZappBot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("starts a fresh backend conversation after clicking new chat", async () => {
    vi.mocked(aiApi.createConversation)
      .mockResolvedValueOnce({ conversation_id: 101 })
      .mockResolvedValueOnce({ conversation_id: 202 });
    vi.mocked(aiApi.sendMessage).mockResolvedValue({
      user_message: {
        id: 1,
        role: "user",
        content: "How much did I spend?",
      },
      assistant_message: {
        id: 2,
        role: "assistant",
        content: "You spent $13.99 in the last 30 days.",
        created_at: "2026-03-28T16:00:00Z",
        metadata_json: {},
      },
    });

    render(
      <MemoryRouter>
        <ZappBot />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /open zapp assistant/i }));

    const input = screen.getByPlaceholderText("Ask ZappBot anything...");
    await user.type(input, "How much did I spend?");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(aiApi.createConversation).toHaveBeenCalledTimes(1);
      expect(aiApi.sendMessage).toHaveBeenCalledWith(
        { devUsername: "tester" },
        101,
        "How much did I spend?",
        undefined
      );
    });

    await screen.findByText("You spent $13.99 in the last 30 days.");

    await user.click(screen.getByRole("button", { name: /new chat/i }));

    expect(screen.getByText(/Hello! I'm ZappBot\./i)).toBeInTheDocument();
    expect(screen.queryByText("How much did I spend?")).not.toBeInTheDocument();
    expect(screen.queryByText("You spent $13.99 in the last 30 days.")).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Ask ZappBot anything..."), "What subscriptions are active?");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(aiApi.createConversation).toHaveBeenCalledTimes(2);
      expect(aiApi.sendMessage).toHaveBeenLastCalledWith(
        { devUsername: "tester" },
        202,
        "What subscriptions are active?",
        undefined
      );
      expect(aiApi.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps route quick actions as navigation buttons", async () => {
    vi.mocked(aiApi.createConversation).mockResolvedValue({ conversation_id: 303 });
    vi.mocked(aiApi.sendMessage).mockResolvedValue({
      user_message: {
        id: 1,
        role: "user",
        content: "Log a purchase",
      },
      assistant_message: {
        id: 2,
        role: "assistant",
        content: "Choose where you want to update your data:",
        created_at: "2026-03-28T16:10:00Z",
        metadata_json: {
          quick_actions: [{ label: "Add Transaction", route: "/transactions/new/" }],
        },
      },
    });

    render(
      <MemoryRouter>
        <ZappBot />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /open zapp assistant/i }));
    await user.type(screen.getByPlaceholderText("Ask ZappBot anything..."), "Log a purchase");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const routeButton = await screen.findByRole("button", { name: "Add Transaction" });
    await user.click(routeButton);

    expect(navigateMock).toHaveBeenCalledWith("/transactions/new");
  });

  it("sends chat-action quick actions back to the messages endpoint", async () => {
    vi.mocked(aiApi.createConversation).mockResolvedValue({ conversation_id: 404 });
    vi.mocked(aiApi.sendMessage)
      .mockResolvedValueOnce({
        user_message: {
          id: 1,
          role: "user",
          content: "Set satisfaction for Starbucks to 8",
        },
        assistant_message: {
          id: 2,
          role: "assistant",
          content: "Update satisfaction for Starbucks on March 27, 2026 for $12.50 to 8?",
          created_at: "2026-03-28T16:20:00Z",
          metadata_json: {
            quick_actions: [{ label: "Confirm", action_payload: { kind: "confirm_pending_action" } }],
          },
        },
      })
      .mockResolvedValueOnce({
        user_message: {
          id: 3,
          role: "user",
          content: "Confirm",
        },
        assistant_message: {
          id: 4,
          role: "assistant",
          content: "Updated satisfaction.",
          created_at: "2026-03-28T16:21:00Z",
          metadata_json: {},
        },
      });

    render(
      <MemoryRouter>
        <ZappBot />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /open zapp assistant/i }));
    await user.type(
      screen.getByPlaceholderText("Ask ZappBot anything..."),
      "Set satisfaction for Starbucks to 8"
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    const confirmButton = await screen.findByRole("button", { name: "Confirm" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(aiApi.sendMessage).toHaveBeenNthCalledWith(
        1,
        { devUsername: "tester" },
        404,
        "Set satisfaction for Starbucks to 8",
        undefined
      );
      expect(aiApi.sendMessage).toHaveBeenNthCalledWith(
        2,
        { devUsername: "tester" },
        404,
        "Confirm",
        {
          kind: "confirm_pending_action",
        }
      );
    });
    expect(await screen.findByText("Updated satisfaction.")).toBeInTheDocument();
  });
});
