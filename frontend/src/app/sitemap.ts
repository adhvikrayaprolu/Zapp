import {
  DISALLOWED_PREFIXES,
  PUBLIC_ROUTES,
  type PublicRoute,
} from "./routes.public";

/** Strip trailing slashes from a site URL; fall back to localhost for dev. */
export function normalizeSiteUrl(raw?: string): string {
  const value = (raw ?? "").trim();
  const base = value || "http://localhost:5173";
  return base.replace(/\/+$/, "");
}

/** Build the absolute URL for a route path against a normalized site URL. */
function toAbsolute(siteUrl: string, path: string): string {
  return path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
}

export function buildSitemapXml(
  siteUrl: string,
  options: { routes?: readonly PublicRoute[]; lastmod?: string } = {}
): string {
  const routes = options.routes ?? PUBLIC_ROUTES;
  const lastmod = options.lastmod ?? new Date().toISOString();
  const base = normalizeSiteUrl(siteUrl);

  const entries = routes
    .map((route) => {
      const loc = toAbsolute(base, route.path);
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority.toFixed(1)}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function buildRobotsTxt(
  siteUrl: string,
  options: { routes?: readonly PublicRoute[]; disallow?: readonly string[] } = {}
): string {
  const routes = options.routes ?? PUBLIC_ROUTES;
  const disallow = options.disallow ?? DISALLOWED_PREFIXES;
  const base = normalizeSiteUrl(siteUrl);

  const lines = [
    "User-agent: *",
    ...routes.map((route) => `Allow: ${route.path}`),
    ...disallow.map((prefix) => `Disallow: ${prefix}`),
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ];

  return lines.join("\n");
}
