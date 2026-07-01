import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { motionState } = vi.hoisted(() => ({ motionState: { reduce: false } }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => motionState.reduce };
});

import { Reveal, RevealStagger } from "../reveal";

describe("Reveal (reduced motion)", () => {
  it("renders children fully visible and unhidden when reduced motion is preferred", () => {
    motionState.reduce = true;
    const { container } = render(
      <Reveal>
        <p>Visible content</p>
      </Reveal>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    // No opacity:0 / transform left applied — content is not animated away.
    expect(wrapper.style.opacity).toBe("");
    expect(screen.getByText("Visible content")).toBeVisible();
  });

  it("still renders children when motion is allowed", () => {
    motionState.reduce = false;
    render(
      <Reveal>
        <p>Animated content</p>
      </Reveal>
    );
    expect(screen.getByText("Animated content")).toBeInTheDocument();
  });
});

describe("RevealStagger (reduced motion)", () => {
  it("renders every child statically when reduced motion is preferred", () => {
    motionState.reduce = true;
    render(
      <RevealStagger>
        <span>One</span>
        <span>Two</span>
        <span>Three</span>
      </RevealStagger>
    );

    expect(screen.getByText("One")).toBeVisible();
    expect(screen.getByText("Two")).toBeVisible();
    expect(screen.getByText("Three")).toBeVisible();
  });
});
