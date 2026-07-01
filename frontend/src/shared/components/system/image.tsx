import * as React from "react";

const RASTER_EXT_RE = /\.(png|jpe?g)$/i;

/**
 * Derive the sibling `.webp` path for a raster URL (the build emits one beside
 * each PNG/JPEG via the image-webp Vite plugin). Returns undefined for anything
 * that is not a static raster (e.g. data URIs, SVGs, remote URLs).
 */
export function webpFrom(src: string): string | undefined {
  if (!src || src.startsWith("data:") || !RASTER_EXT_RE.test(src)) return undefined;
  return src.replace(RASTER_EXT_RE, ".webp");
}

export type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "loading"> & {
  /** Fallback raster source (PNG/JPEG/data URI) — always rendered as the <img>. */
  src: string;
  /** Modern-format source rendered as a <source> before the fallback. */
  webpSrc?: string;
  /** Optional AVIF source, rendered before WebP. */
  avifSrc?: string;
  /** Eager-load above-the-fold / LCP images. Defaults to lazy. */
  priority?: boolean;
};

/**
 * Reusable image primitive. Renders a `<picture>` with modern-format `<source>`s
 * (AVIF/WebP) when provided, falling back to the original `<img>`. Defaults to
 * lazy loading + async decoding, and forwards width/height so the browser can
 * reserve layout space and avoid CLS.
 */
export function Image({
  src,
  webpSrc,
  avifSrc,
  priority = false,
  alt = "",
  className,
  width,
  height,
  style,
  ...imgProps
}: ImageProps) {
  const img = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={style}
      {...imgProps}
    />
  );

  if (!webpSrc && !avifSrc) return img;

  return (
    <picture>
      {avifSrc ? <source srcSet={avifSrc} type="image/avif" /> : null}
      {webpSrc ? <source srcSet={webpSrc} type="image/webp" /> : null}
      {img}
    </picture>
  );
}
