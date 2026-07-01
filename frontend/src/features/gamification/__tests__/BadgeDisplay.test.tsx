import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BadgeDisplay } from "../components/BadgeDisplay";

vi.mock("motion/react", () => ({
  motion: {
    div: (props: React.ComponentProps<"div">) => React.createElement("div", props, props.children),
  },
}));

const badges = [
  {
    id: 1,
    awarded_at: "2026-03-01T00:00:00Z",
    badge: {
      id: 10,
      name: "Momentum Builder",
      description: "Awarded for keeping a reflection streak alive.",
      icon: "zap",
      category: "streaks",
    },
  },
] as const;

describe("BadgeDisplay", () => {
  it("shows badge info only when the individual badge trigger is hovered", () => {
    render(<BadgeDisplay badges={[...badges] as any} size="lg" />);

    const tooltip = screen.getByTestId("badge-tooltip-1");
    expect(tooltip).toHaveClass("opacity-0");

    const trigger = screen.getByRole("button", { name: /momentum builder badge details/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.mouseEnter(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(tooltip).toHaveClass("opacity-100");

    fireEvent.mouseLeave(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(tooltip).toHaveClass("opacity-0");
  });
});
