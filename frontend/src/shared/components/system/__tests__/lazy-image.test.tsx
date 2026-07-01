import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LazyImage } from "../lazy-image";

type Captured = { cb: IntersectionObserverCallback } | null;
let captured: Captured = null;

class MockIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    captured = { cb };
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = () => [];
  root = null;
  rootMargin = "";
  thresholds = [];
}

beforeEach(() => {
  captured = null;
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LazyImage", () => {
  it("renders only a placeholder until it scrolls into view, then loads the image", () => {
    render(
      <LazyImage src="/logo.png" webpSrc="/logo.webp" alt="Brand" width={64} height={64} aspectRatio="1 / 1" />
    );

    // Before intersection: no <img> request yet.
    expect(screen.queryByAltText("Brand")).toBeNull();

    // Simulate the element scrolling into view.
    act(() => {
      captured?.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    const img = screen.getByAltText("Brand");
    expect(img.tagName).toBe("IMG");
    expect(img.closest("picture")?.querySelector("source[type='image/webp']")).not.toBeNull();
  });
});
