import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ZappBot } from "../components/ZappBot";
import { PanelProvider } from "../context/PanelContext";

const mockUseAuth = vi.fn();

vi.mock("@/features/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/api/ai.api", () => ({
  createConversation: vi.fn(),
  sendMessage: vi.fn(),
  sendMessageStream: vi.fn(),
}));

vi.mock("motion/react", () => {
  const React = require("react") as typeof import("react");
  const stripMotionProps = <T extends Record<string, unknown>>(props: T) => {
    const { animate, initial, exit, whileTap, transition, viewport, ...domProps } = props;
    return domProps;
  };
  return {
    motion: {
      div: (props: React.ComponentProps<"div">) =>
        React.createElement("div", stripMotionProps(props), props.children),
      button: (props: React.ComponentProps<"button">) =>
        React.createElement("button", stripMotionProps(props), props.children),
    },
      AnimatePresence: ({ children }: { children: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children),
    useMotionValue: (v: number) => ({ set: vi.fn(), get: () => v }),
    useSpring: (v: unknown) => v,
    useTransform: () => 0,
    useReducedMotion: () => false,
  };
});

function renderZappBot() {
  return render(
    <MemoryRouter>
      <PanelProvider>
        <ZappBot />
      </PanelProvider>
    </MemoryRouter>
  );
}

describe("ZappBot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      user: { supabaseUid: "uid-abc", username: "seed_user_0", name: "T", email: "t@e.com", id: "x", createdAt: "" },
    });
  });

  afterEach(() => {
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
    localStorage.clear();
  });

  it("scopes conversation id in localStorage by supabaseUid", async () => {
    mockUseAuth.mockReturnValue({
      user: { supabaseUid: "uid-abc", username: "seed_user_0", name: "T", email: "t@e.com", id: "x", createdAt: "" },
    });

    localStorage.setItem("zapp_conversation_id_uid-abc", "42");

    renderZappBot();

    await waitFor(() => {
      expect(localStorage.getItem("zapp_conversation_id_uid-abc")).toBe("42");
    });
  });

  it("does not reuse a different user's stored conversation id", async () => {
    localStorage.setItem("zapp_conversation_id_uid-other", "99");
    mockUseAuth.mockReturnValue({
      user: { supabaseUid: "uid-me", username: "seed_user_0", name: "T", email: "t@e.com", id: "x", createdAt: "" },
    });

    renderZappBot();

    await waitFor(() => {
      expect(localStorage.getItem("zapp_conversation_id_uid-me")).toBeNull();
    });
    expect(localStorage.getItem("zapp_conversation_id_uid-other")).toBe("99");
  });

  it("shows hover highlight only while the trigger is hovered", () => {
    renderZappBot();

    const trigger = screen.getByRole("button", { name: /open zapp assistant/i });
    expect(screen.queryByTestId("zappbot-hover-highlight")).toBeNull();

    fireEvent.mouseEnter(trigger);
    expect(screen.getByTestId("zappbot-hover-highlight")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("data-hovered", "true");

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByTestId("zappbot-hover-highlight")).toBeNull();
    expect(trigger).toHaveAttribute("data-hovered", "false");
  });

  it("shows the ask a question prompt once on initial load and then stops repeating", () => {
    vi.useFakeTimers();

    renderZappBot();

    expect(screen.getByText(/ask a question/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3201);
    });
    expect(screen.queryByText(/ask a question/i)).toBeNull();

    const trigger = screen.getByRole("button", { name: /open zapp assistant/i });
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText(/ask a question/i)).toBeNull();
  });
});
