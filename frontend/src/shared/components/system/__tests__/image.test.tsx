import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Image, webpFrom } from "../image";

describe("webpFrom", () => {
  it("maps raster paths to a .webp sibling", () => {
    expect(webpFrom("/logo.png")).toBe("/logo.webp");
    expect(webpFrom("/nested/photo.JPG")).toBe("/nested/photo.webp");
  });

  it("returns undefined for non-raster sources", () => {
    expect(webpFrom("data:image/png;base64,AAAA")).toBeUndefined();
    expect(webpFrom("/icon.svg")).toBeUndefined();
    expect(webpFrom("")).toBeUndefined();
  });
});

describe("Image", () => {
  it("renders a plain lazy, async-decoding img when no modern source is given", () => {
    render(<Image src="/logo.png" alt="Logo" width={64} height={64} />);

    const img = screen.getByAltText("Logo");
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.closest("picture")).toBeNull();
  });

  it("wraps the img in <picture> with a WebP source when provided", () => {
    render(<Image src="/logo.png" webpSrc="/logo.webp" alt="Logo" />);

    const picture = screen.getByAltText("Logo").closest("picture");
    expect(picture).not.toBeNull();
    const source = picture!.querySelector("source[type='image/webp']");
    expect(source?.getAttribute("srcset")).toBe("/logo.webp");
  });

  it("loads eagerly when priority is set", () => {
    render(<Image src="/hero.png" alt="Hero" priority />);
    expect(screen.getByAltText("Hero").getAttribute("loading")).toBe("eager");
  });
});
