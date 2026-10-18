# Zapp backend

Django 6 + Django REST Framework API for Zapp. See the [root README](../README.md) for the
product overview, screenshots and the one-command local setup (`./scripts/setup-local.sh`).

## Run it

Python 3.13 (see `.python-version`).

```bash
python3.13 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # set SECRET_KEY and DATABASE_URL at minimum
python manage.py migrate
python manage.py seed_demo        # deterministic demo account for the "Try the demo account" button
python manage.py runserver 127.0.0.1:8000
```

`manage.py` defaults to `config.settings.development`. For SQLite, use an absolute path,
e.g. `DATABASE_URL=sqlite:////abs/path/to/backend/db.sqlite3`; a relative path resolves
from whatever folder you start Django in. Check it's up with `GET /healthz/`.

## Settings

| Module | Used for |
| --- | --- |
| `config.settings.development` | Local work: `DEBUG` on, loopback CORS/CSRF origins, relaxed banking gates, demo login enabled |
| `config.settings.test` | The test suite and CI |
| `config.settings.production` | Deployments: HTTPS, secure cookies, MFA required, demo login forced off; validated at startup by `config/security/` |

The full, annotated list of environment variables is in [`.env.example`](.env.example).

## Management commands

| Command | What it does |
| --- | --- |
| `seed_demo [--months N]` | Reset the local demo account `demo_user_0` (DEBUG only) |
| `seed --users N --months M [--seed S]` | Generate synthetic users with the agent-based generator in `datagen/` |
| `wipe_seed --prefix seed_` | Delete seeded users and their data |
| `recompute_value_scores`, `recompute_transaction_valuations` | Re-run scoring (needs the external model checkpoints) |
| `verify_plaid_access_tokens_encrypted` | Production safety check used by CD |

## Tests and CI checks

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

CI runs these with `DJANGO_SETTINGS_MODULE=config.settings.test` and SQLite; see
[`.github/workflows/backend-ci.yml`](../.github/workflows/backend-ci.yml) for the exact
environment.

## Layout

```text
config/       settings, root URLs, production security validation, alert rules
core/         shared helpers (app-level Fernet encryption for sensitive fields)
datagen/      synthetic finance data generator behind `seed` / `seed_demo`
apps/
  users/          Supabase session auth (server-side tokens), MFA, demo login, onboarding profile
  transactions/   manual transactions, feedback ratings, feedback-derived scores
  subscriptions/  recurring subscriptions and merchants
  valuations/     value scores (0-150), model integration, and the pre-purchase check
  ai/             ZappBot conversations (OpenAI when configured, local answers otherwise)
  banking/        Plaid link, accounts and transaction sync
  gamification/   streaks, points, badges, circles, reviews, monthly targets
  integrations/   Spotify
  compliance/     privacy policy metadata, audit events, consent
  waitlist/       public early-access signups
```

## How a few things work

- **Auth:** Supabase access and refresh tokens stay in the server-side session; the browser
  only ever gets a Django session cookie. Unsafe requests need the `csrftoken` cookie value in
  `X-CSRFToken`. Full sign-in requires MFA (AAL2) when `AUTH_REQUIRE_AAL2` is on.
- **Demo login:** `POST /api/auth/demo-login/` issues the same fully verified session for
  `DEMO_LOGIN_USERNAME`, but only when `DEBUG` and `DEMO_LOGIN_ENABLED` are both on.
- **Value scores:** the ML model lives in the separate
  [`value_score_model`](https://github.com/zapp-startup/value_score_model) repo. Point
  `VALUE_SCORE_BUNDLE_PATH` and `VALUE_SCORE_CHECKPOINT_DIR` at it to recompute scores. Without
  checkpoints the recompute endpoints return 503; stored and feedback-derived scores still work.
- **Purchase check:** `POST /api/purchase-check/` (`apps/valuations/services/purchase_check.py`)
  is a transparent rule-based score built from the user's last 180 days in a category. It
  doesn't use the model.
- **Encryption:** amounts, descriptions, ratings and profile answers are encrypted at rest with
  `APP_DATA_ENCRYPTION_KEY`, and Plaid tokens with `PLAID_TOKEN_ENCRYPTION_KEY`. Both support
  key rotation lists.

More detail on the AI module's local testing lives in [`apps/ai/README.md`](apps/ai/README.md).
