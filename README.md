# Zapp Web App

Zapp is a personal finance and utility app. This repository is the consolidated
monorepo for its two core services:

- **`frontend/`** — Vite + React + TypeScript single-page app.
- **`backend/`** — Django 6 + Django REST Framework API.

Together they cover auth, onboarding, banking (Plaid), transactions,
subscriptions, valuations, gamification, AI chat, compliance, integrations,
and waitlist capture.

## Repository Layout

```text
web-app/
  .github/    Shared CI/CD workflows and dependabot config for both services
  frontend/   React + TypeScript client (see frontend/README.md)
  backend/    Django REST API (see backend/README.md)
  .docs/      Reference docs, notes, presentation deck, and in-progress plans — gitignored, not part of the shipped repo
```

## Getting Started

### Frontend

```powershell
cd frontend
npm install
npm run dev        # local dev server
npm run build       # production build
npm run test:run    # test suite
```

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate --settings=config.settings.development
python manage.py runserver --settings=config.settings.development
```

Each service also has its own `README.md` with service-specific setup detail,
environment variables, and project layout.

## Documentation

All docs live under `.docs/`, which is gitignored (local-only, never committed):

- `.docs/frontend/` — frontend guidelines, feature/dev conventions, and the
  in-progress UI migration tracker.
- `.docs/backend/` — backend security architecture, control map, encryption
  decisions, deployment verification, AI prompt spec, runbooks, and the DB
  audit/indexing plan.
- `.docs/presentation/` — the team presentation deck (PDF/PPTX), moved out of
  `frontend/public/` since it isn't an asset the running app serves.

## CI/CD

Workflows live in `.github/workflows/` at the repo root (GitHub only discovers
workflows there, not in subdirectories):

- `frontend-ci.yml` — runs on `frontend/**` changes: install, test, build.
- `backend-ci.yml` — runs on `backend/**` changes: Django checks, migration
  check, tests.
- `backend-cd.yml` — deploys `backend/` on push to `main`, gated on a
  `DEPLOY_WEBHOOK_URL` secret.

`.github/dependabot.yml` covers npm (`/frontend`), pip (`/backend`), and the
workflows themselves (`github-actions`).

## History Note

`frontend` and `backend` were previously separate git repositories
(`zapp-startup/frontend` and `zapp-startup/backend`). This repository
(`zapp-startup/web-app`) consolidates both into a single monorepo starting
from a fresh git history; the prior per-service commit history remains in
the original GitHub repositories.
