import "@testing-library/jest-dom/vitest";

// jsdom does not implement IntersectionObserver, which motion's `whileInView`
// and our viewport hooks (useInViewport / LazyImage / Deferred) rely on.
// Provide a mock that reports the target as in-view on observe(), so scroll-
// reveal and lazy-mounted content is present in tests. Individual tests can
// still override this via vi.stubGlobal to control timing precisely.
if (typeof globalThis.IntersectionObserver === "undefined") {
  class IntersectionObserverMock implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element): void {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this
      );
    }

    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver =
    IntersectionObserverMock as unknown as typeof IntersectionObserver;
}
