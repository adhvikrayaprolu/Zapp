import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PrivacyPolicyPage } from "../PrivacyPolicyPage";

vi.mock("@/config/privacy", () => ({
  usePrivacyPolicyMeta: () => ({
    version: "2.3.0",
    effectiveDate: "2026-04-15",
    supportEmail: "support@example.com",
    privacyEmail: "privacy@example.com",
    url: "/privacy",
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPolicyPage />
    </MemoryRouter>
  );
}

describe("PrivacyPolicyPage", () => {
  it("renders the policy with shared page and surface styling", () => {
    renderPage();

    expect(screen.getByTestId("privacy-policy-page")).toHaveAttribute("aria-labelledby", "privacy-policy-title");
    expect(screen.getByText("Privacy Policy").closest("h1")).toHaveClass("app-page-title");
    expect(screen.getByText("Privacy Policy")).toHaveAttribute("id", "privacy-policy-title");
    expect(screen.getByText("On this page").closest("nav")).toHaveClass("privacy-policy-nav", "app-surface-inset");
    expect(screen.getByText("Version").closest("dt")).toHaveClass("app-mini-label");
  });

  it("exposes semantic landmarks, headings, and policy metadata", () => {
    renderPage();

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Privacy policy sections" })).toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "1. Information we collect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "9. Changes" })).toBeInTheDocument();
    expect(screen.getByText("2.3.0")).toBeInTheDocument();
    expect(screen.getByText("2026-04-15")).toBeInTheDocument();
  });

  it("renders table-of-contents links and back-to-top anchors", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "Privacy policy sections" });
    const tocLink = within(nav).getByRole("link", { name: "3. Financial data and Plaid" });

    expect(tocLink).toHaveAttribute("href", "#financial-data-and-plaid");
    expect(screen.getByRole("link", { name: "Back to top" })).toHaveAttribute("href", "#privacy-policy-top");
    expect(screen.getByRole("link", { name: /contact privacy team/i })).toHaveAttribute(
      "href",
      "mailto:privacy@example.com"
    );
  });

  it("includes document styling hooks for readability and print behavior", () => {
    renderPage();

    expect(screen.getByText("Privacy Policy").closest("main")).toHaveClass("print:max-w-none", "print:px-0");
    expect(screen.getByRole("article").querySelector(".privacy-policy-document")).toBeTruthy();
    expect(screen.getByRole("article").querySelector(".privacy-policy-copy")).toBeTruthy();
    expect(screen.getByRole("article").querySelector(".privacy-policy-divider")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back" })).toHaveClass("app-button");
  });
});
