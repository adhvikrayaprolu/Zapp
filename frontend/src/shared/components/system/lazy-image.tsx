import * as React from "react";

import { cn } from "@/shared/components/ui/utils";
import { Image, type ImageProps } from "./image";
import { useInViewport } from "./use-in-viewport";

export type LazyImageProps = ImageProps & {
  /** Pre-trigger margin; the image starts loading ~this far before view. */
  rootMargin?: string;
  /** Wrapper className (placeholder + image share this reserved box). */
  wrapperClassName?: string;
  /** Reserve space to avoid CLS, e.g. "16 / 9" or "1 / 1". */
  aspectRatio?: number | string;
};

/**
 * Image that only requests its source once it nears the viewport. Until then it
 * renders a skeleton placeholder inside a dimension-reserved box (no layout
 * shift). Builds on <Image>, so it keeps the WebP `<source>` + raster fallback,
 * async decoding, and native lazy-loading once mounted.
 *
 * The skeleton pulse is gated behind `motion-safe`, so reduced-motion users get
 * a static placeholder.
 */
export function LazyImage({
  rootMargin = "200px",
  wrapperClassName,
  aspectRatio,
  width,
  height,
  className,
  style,
  ...imageProps
}: LazyImageProps) {
  const { ref, inView } = useInViewport<HTMLSpanElement>({ rootMargin, once: true });

  const reservedStyle: React.CSSProperties = {};
  if (aspectRatio != null) reservedStyle.aspectRatio = String(aspectRatio);
  if (width != null) reservedStyle.width = typeof width === "number" ? `${width}px` : width;
  if (height != null) reservedStyle.height = typeof height === "number" ? `${height}px` : height;

  return (
    <span
      ref={ref}
      className={cn("relative inline-block overflow-hidden", wrapperClassName)}
      style={reservedStyle}
    >
      {inView ? (
        <Image
          {...imageProps}
          width={width}
          height={height}
          className={className}
          style={style}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "block h-full w-full rounded-[inherit] bg-white/5 motion-safe:animate-pulse",
            className
          )}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </span>
  );
}
