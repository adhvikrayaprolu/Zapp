import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { APP_THEME } from "@/shared/theme";
import { AppThemeProvider, useAppThemeMode } from "@/shared/theme-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

describe("theme system", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  });

  afterEach(() => {
    delete window.__ZAPP_THEME__;
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  it("applies root theme variables through the provider", () => {
    render(
      <AppThemeProvider>
        <div>content</div>
      </AppThemeProvider>
    );

    expect(document.documentElement.style.getPropertyValue("--app-bg-canvas")).toBe(APP_THEME.colors.canvas);
    expect(document.documentElement.style.getPropertyValue("--app-radius-pill")).toBe(APP_THEME.radius.pill);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("accepts backend-injected runtime theme overrides", () => {
    window.__ZAPP_THEME__ = {
      colors: {
        canvas: "#010203",
        accentCyan: "#44eeff",
      },
      radius: {
        pill: "3rem",
      },
    };

    render(
      <AppThemeProvider>
        <div>runtime</div>
      </AppThemeProvider>
    );

    expect(document.documentElement.style.getPropertyValue("--app-bg-canvas")).toBe("#010203");
    expect(document.documentElement.style.getPropertyValue("--app-accent-cyan")).toBe("#44eeff");
    expect(document.documentElement.style.getPropertyValue("--app-radius-pill")).toBe("3rem");
  });

  it("marks shared controls with the standardized consistency classes", () => {
    render(
      <div>
        <Button>Save</Button>
        <Input aria-label="Name" />
      </div>
    );

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("app-button");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveClass("app-input");
  });

  it("persists and toggles light and dark mode", () => {
    function Probe() {
      const { mode, toggleMode } = useAppThemeMode();
      return <button onClick={toggleMode}>{mode}</button>;
    }

    render(
      <AppThemeProvider>
        <Probe />
      </AppThemeProvider>
    );

    const toggle = screen.getByRole("button", { name: "dark" });
    expect(document.documentElement).toHaveClass("dark");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "light" })).toBeInTheDocument();
    expect(document.documentElement).toHaveClass("light");
    expect(window.localStorage.getItem("zapp_theme_mode")).toBe("light");
  });
});
