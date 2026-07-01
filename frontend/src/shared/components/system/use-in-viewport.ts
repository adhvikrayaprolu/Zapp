import * as React from "react";

export type UseInViewportOptions = {
  /** Margin around the root, pre-triggering before the element is visible. */
  rootMargin?: string;
  /** Stop observing after the first intersection (default true). */
  once?: boolean;
};

/**
 * Track whether the referenced element is at/near the viewport via
 * IntersectionObserver. Powers lazy image loading, deferred section mounting,
 * and infinite-scroll sentinels.
 *
 * Degrades safely where IntersectionObserver is unavailable (SSR / jsdom):
 * reports `inView: true` so content is never permanently hidden.
 */
export function useInViewport<T extends Element>(options: UseInViewportOptions = {}) {
  const { rootMargin = "200px", once = true } = options;
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    if (once && inView) return;
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, once, rootMargin]);

  return { ref, inView } as const;
}
