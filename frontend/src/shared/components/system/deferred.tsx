import * as React from "react";

import { useInViewport } from "./use-in-viewport";

export type DeferredProps = {
  children: React.ReactNode;
  /** Pre-trigger margin; children mount ~this far before entering view. */
  rootMargin?: string;
  /** Reserve vertical space before mount to avoid layout shift. */
  minHeight?: number | string;
  /** Optional placeholder rendered before the children mount. */
  fallback?: React.ReactNode;
  className?: string;
};

/**
 * Mounts heavy below-the-fold content only once it nears the viewport. Reserves
 * `minHeight` before mounting so the page does not jump when the real content
 * arrives. This is content-level deferral — distinct from the route-level
 * `React.lazy` code-splitting already used in DashboardLayout.
 */
export function Deferred({
  children,
  rootMargin = "200px",
  minHeight,
  fallback = null,
  className,
}: DeferredProps) {
  const { ref, inView } = useInViewport<HTMLDivElement>({ rootMargin, once: true });

  return (
    <div ref={ref} className={className} style={inView ? undefined : { minHeight }}>
      {inView ? children : fallback}
    </div>
  );
}
