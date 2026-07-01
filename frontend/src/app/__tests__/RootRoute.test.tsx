import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

const { authState } = vi.hoisted(() => ({
  authState: { isAuthenticated: false, isAuthReady: true },
}));

vi.mock("@/features/auth", () => ({ useAuth: () => authState }));
vi.mock("@/features/marketing", () => ({
  MarketingLandingPage: () => <div>PUBLIC LANDING</div>,
}));

import { RootRoute } from "../RootRoute";

function renderRoot() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/home" element={<div>DASHBOARD HOME</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RootRoute", () => {
  it("shows the public landing page for anonymous visitors", () => {
    authState.isAuthenticated = false;
    authState.isAuthReady = true;
    renderRoot();
    expect(screen.getByText("PUBLIC LANDING")).toBeInTheDocument();
    expect(screen.queryByText("DASHBOARD HOME")).toBeNull();
  });

  it("redirects authenticated users to /home", () => {
    authState.isAuthenticated = true;
    authState.isAuthReady = true;
    renderRoot();
    expect(screen.getByText("DASHBOARD HOME")).toBeInTheDocument();
    expect(screen.queryByText("PUBLIC LANDING")).toBeNull();
  });

  it("renders nothing until auth is ready (no flash of either view)", () => {
    authState.isAuthenticated = false;
    authState.isAuthReady = false;
    renderRoot();
    expect(screen.queryByText("PUBLIC LANDING")).toBeNull();
    expect(screen.queryByText("DASHBOARD HOME")).toBeNull();
  });
});
