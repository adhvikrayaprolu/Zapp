import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

import { buildRobotsTxt, buildSitemapXml, normalizeSiteUrl } from "../src/app/sitemap";

function writeArtifacts(dir: string, siteUrl: string) {
  const normalized = normalizeSiteUrl(siteUrl);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "sitemap.xml"), buildSitemapXml(normalized), "utf-8");
  fs.writeFileSync(path.join(dir, "robots.txt"), buildRobotsTxt(normalized), "utf-8");

  if (!siteUrl || /localhost|127\.0\.0\.1/.test(normalized)) {
    console.warn(
      `[sitemap] VITE_SITE_URL is unset or loopback (${normalized}). Set a real ` +
        "production URL before deploying so the sitemap/robots use it."
    );
  } else {
    console.log(`[sitemap] wrote sitemap.xml + robots.txt for ${normalized}`);
  }
}

/** Public origin used for production builds when VITE_SITE_URL is not set. */
export const DEFAULT_PRODUCTION_SITE_URL = "https://zappai.co";

/**
 * Generate sitemap.xml + robots.txt from the public-routes manifest on every
 * build and dev-server start. Written into `publicDir` so the dev server serves
 * them and the build copies them into the output dir — no manual upkeep, and
 * route changes in routes.public.ts propagate automatically.
 *
 * Also fills the `%ZAPP_SITE_URL%` placeholder in index.html (canonical / Open
 * Graph URLs) from the same origin, so production builds never point at a
 * loopback host.
 */
export function sitemapPlugin(options: { publicDir: string; siteUrl?: string }): Plugin {
  let siteUrl = options.siteUrl ?? "";
  return {
    name: "zapp-sitemap",
    configResolved(config) {
      if (!siteUrl && config.command === "build") siteUrl = DEFAULT_PRODUCTION_SITE_URL;
    },
    buildStart() {
      writeArtifacts(options.publicDir, siteUrl);
    },
    configureServer() {
      writeArtifacts(options.publicDir, siteUrl);
    },
    transformIndexHtml(html) {
      return html.replaceAll("%ZAPP_SITE_URL%", normalizeSiteUrl(siteUrl));
    },
  };
}
