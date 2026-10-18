#!/usr/bin/env bash
# Run the Django API (127.0.0.1:8000) and the Vite app (127.0.0.1:5173) together.
# Ctrl+C stops both. Run ./scripts/setup-local.sh once first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[ -x "$ROOT/backend/.venv/bin/python" ] || { echo "Run ./scripts/setup-local.sh first."; exit 1; }

trap 'kill 0' EXIT INT TERM

(cd "$ROOT/backend" && .venv/bin/python manage.py runserver 127.0.0.1:8000) &
(cd "$ROOT/frontend" && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort) &

echo "API: http://127.0.0.1:8000/healthz/   App: http://127.0.0.1:5173/login"
wait
