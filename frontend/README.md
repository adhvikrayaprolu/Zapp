# Zapp frontend

React 18 + TypeScript single-page app built with Vite, Tailwind CSS, Radix UI, Motion and
Recharts. See the [root README](../README.md) for the product overview, screenshots and the
one-command local setup (`./scripts/setup-local.sh`).

## Run it

Node 20+ (see `.nvmrc`). Start the backend first. The app talks to it at `VITE_API_URL`.

```bash
npm ci
cp .env.example .env.local   # then set VITE_API_URL=http://127.0.0.1:8000 and VITE_DEMO_LOGIN=true
npm run dev                  # http://127.0.0.1:5173
```

The dev server binds to `127.0.0.1` so session cookies and OAuth callbacks stay on the same
loopback host as the API. Open the app at `127.0.0.1`, not `localhost`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run test:run` | Vitest suite, run once (`npm test` watches) |
| `npm run build` | Production build into `dist/` |

There is no separate type-check step: Vite transpiles TypeScript without checking types.

## Environment variables

All `VITE_*` values are baked into the public bundle at build time, so **never put
secrets in them**. See [`.env.example`](.env.example) for the annotated list.

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend origin, no trailing slash (`http://127.0.0.1:8000` locally) |
| `VITE_DEMO_LOGIN` | `true` shows **Try the demo account** on `/login` (local only) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Public Supabase values for real sign-in |
| `VITE_SITE_URL` | Public origin used for `sitemap.xml`, `robots.txt` and canonical/OG URLs in builds |
| `VITE_DEMO_VIDEO_URL` | Video embedded on `/waitlist` (Google Drive, YouTube or Vimeo link) |

## Layout

```text
src/
  app/          routes (App.tsx) and the anonymous-vs-signed-in root route
  features/     one folder per area: auth, onboarding, home (dashboard), transactions,
                subscriptions, search (Decision Engine), dashboard (layout, Buy Advisor,
                ZappBot), analytics, gamification, profile, marketing
  api/          typed fetch clients for each backend app (client.ts handles cookies + CSRF)
  shared/       design system (components/system), value-score helpers, theme, dates
  LandingPage.tsx   the public /waitlist page
build/          Vite plugins: sitemap/robots generation and WebP siblings for brand images
private/        Vite publicDir: put brand images here (generated sitemap/robots/.webp are gitignored)
```

## Notes

- **Value scores** use a 0–150 scale (about 100 means a good match). Use
  `normalizeModelValueScore` and `getValuePresentation` in `src/shared/valuation.ts` rather
  than rescaling by hand.
- **Signed-out 403s:** a `403` from `/api/auth/me/` is how the API reports "not signed
  in". `AuthContext` treats it as signed out.
