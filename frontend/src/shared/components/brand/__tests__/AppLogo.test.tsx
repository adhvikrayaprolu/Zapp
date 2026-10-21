import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppLogo } from "../AppLogo";

const theme = vi.hoisted(() => ({ mode: "dark" as "dark" | "light" }));
vi.mock("@/shared/theme-provider", () => ({ useAppThemeMode: () => theme }));

describe("AppLogo", () => {
  it("falls back to the wordmark when the logo image fails, including after a theme switch", () => {
    theme.mode = "dark";
    const { rerender } = render(<AppLogo />);
    fireEvent.error(screen.getByRole("img", { name: "Zapp logo" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Zapp")).toBeInTheDocument();

    // The light-theme logo is a different file: try it, and fall back again if it's missing too.
    theme.mode = "light";
    rerender(<AppLogo />);
    fireEvent.error(screen.getByRole("img", { name: "Zapp logo" }));
    expect(screen.getByText("Zapp")).toBeInTheDocument();
  });
});
