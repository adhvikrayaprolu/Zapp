/**
 * Single source of truth for public, indexable SPA routes.
 *
 * Imported by both `App.tsx` (route paths) and the build-time sitemap generator
 * (`build/sitemapPlugin.ts`). Adding a public route here propagates to the
 * sitemap/robots on the next build with no other edits.
 *
 * Auth-gated and transient routes (/home, /transactions, /subscriptions,
 * /analytics, /profile, /circles, /badges, /targets, /reviews/*, /auth/callback,
 * /mfa*, /onboarding, /integrations/*) are intentionally excluded.
 */
export type ChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type PublicRoute = {
  path: string;
  changefreq: ChangeFreq;
  priority: number;
};

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/login", changefreq: "monthly", priority: 0.6 },
  { path: "/signup", changefreq: "monthly", priority: 0.8 },
  { path: "/waitlist", changefreq: "monthly", priority: 0.7 },
  { path: "/privacy", changefreq: "yearly", priority: 0.3 },
];

/** Named path constants so App.tsx and the manifest never drift. */
export const PUBLIC_ROUTE_PATHS = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  waitlist: "/waitlist",
  privacy: "/privacy",
} as const;

/**
 * Path prefixes that must never be crawled/indexed. Used to build the robots.txt
 * Disallow list. Kept here so it stays beside the public allow-list.
 */
export const DISALLOWED_PREFIXES: readonly string[] = [
  "/home",
  "/transactions",
  "/subscriptions",
  "/analytics",
  "/profile",
  "/circles",
  "/badges",
  "/targets",
  "/reviews",
  "/auth",
  "/mfa",
  "/onboarding",
  "/integrations",
];
