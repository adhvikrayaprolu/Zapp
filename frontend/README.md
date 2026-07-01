# Zapp

Frontend for Zapp Django REST based project for INFO 490

## Running the code
Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

The frontend dev server is configured to bind to `http://127.0.0.1:5173/` by default so local auth flows stay on the
same loopback host as the backend OAuth callback.

## Landing page assets
The marketing landing page now lives in [`src/LandingPage.tsx`](/tmp/zapp-frontend-landing/src/LandingPage.tsx) and ships with the presentation assets in [`public/presentation`](/tmp/zapp-frontend-landing/public/presentation).

Optional environment variables:

- `VITE_API_URL` for waitlist submissions
- `VITE_DEMO_VIDEO_URL` for embedding a hosted demo video alongside the PDF deck
