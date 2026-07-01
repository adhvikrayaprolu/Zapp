import { describe, expect, it } from "vitest";

import { PUBLIC_ROUTES } from "../routes.public";
import { buildRobotsTxt, buildSitemapXml, normalizeSiteUrl } from "../sitemap";

describe("normalizeSiteUrl", () => {
  it("strips trailing slashes and falls back to localhost when empty", () => {
    expect(normalizeSiteUrl("https://app.zapp.com/")).toBe("https://app.zapp.com");
    expect(normalizeSiteUrl("https://app.zapp.com///")).toBe("https://app.zapp.com");
    expect(normalizeSiteUrl("")).toBe("http://localhost:5173");
    expect(normalizeSiteUrl(undefined)).toBe("http://localhost:5173");
  });
});

describe("buildSitemapXml", () => {
  const xml = buildSitemapXml("https://app.zapp.com", { lastmod: "2026-06-29T00:00:00.000Z" });

  it("emits one absolute <loc> per public route", () => {
    for (const route of PUBLIC_ROUTES) {
      const expected = route.path === "/" ? "https://app.zapp.com/" : `https://app.zapp.com${route.path}`;
      expect(xml).toContain(`<loc>${expected}</loc>`);
    }
    const locCount = (xml.match(/<loc>/g) ?? []).length;
    expect(locCount).toBe(PUBLIC_ROUTES.length);
  });

  it("excludes auth-gated routes", () => {
    expect(xml).not.toContain("/home");
    expect(xml).not.toContain("/transactions");
    expect(xml).not.toContain("/profile");
  });

  it("includes lastmod and is well-formed", () => {
    expect(xml).toContain("<lastmod>2026-06-29T00:00:00.000Z</lastmod>");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("</urlset>");
  });
});

describe("buildRobotsTxt", () => {
  const robots = buildRobotsTxt("https://app.zapp.com/");

  it("allows public routes and disallows auth-gated prefixes", () => {
    expect(robots).toContain("Allow: /signup");
    expect(robots).toContain("Disallow: /home");
    expect(robots).toContain("Disallow: /transactions");
  });

  it("points at the absolute sitemap URL", () => {
    expect(robots).toContain("Sitemap: https://app.zapp.com/sitemap.xml");
  });
});
