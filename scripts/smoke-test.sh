#!/usr/bin/env bash
# End-to-end smoke test against a running app (./scripts/dev.sh), through the
# frontend origin so the Vite proxy, session cookies and CSRF are exercised the
# same way a browser uses them.
#
#   ./scripts/smoke-test.sh                       # defaults to http://127.0.0.1:5173
#   BASE_URL=http://localhost:5173 ./scripts/smoke-test.sh
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:5173}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

pass() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*"; exit 1; }
json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
csrf() { awk '$6 == "csrftoken" { print $7 }' "$JAR" | tail -1; }
get() { curl -sS -b "$JAR" -c "$JAR" "$BASE$1"; }
post() {
  local body="${2:-}"
  [ -n "$body" ] || body='{}'
  curl -sS -b "$JAR" -c "$JAR" -X POST "$BASE$1" \
    -H "Content-Type: application/json" -H "Origin: $BASE" -H "X-CSRFToken: $(csrf)" \
    -d "$body"
}

echo "Smoke testing $BASE"

for _ in $(seq 1 90); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/healthz/")" = "200" ] && break
  sleep 1
done
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/healthz/")" = "200" ] || fail "API health check via $BASE/healthz/"
pass "API healthy (proxied through the frontend origin)"

get "/" | grep -q '<div id="root">' || fail "frontend did not serve the app shell"
pass "frontend serves the app"

[ "$(get /api/auth/session/ | json 'd["authenticated"]')" = "False" ] || fail "fresh session should be signed out"
pass "signed-out session probe"

get /api/auth/csrf/ >/dev/null
[ "$(get /api/auth/demo-login/ | json 'd["enabled"]')" = "True" ] || fail "demo login should be enabled in development"
login="$(post /api/auth/demo-login/)"
[ "$(echo "$login" | json 'd["next_step"]')" = "dashboard" ] || fail "demo login: $login"
pass "demo sign-in (fully verified session)"

[ "$(get /api/auth/me/ | json 'd["username"]')" = "demo_user_0" ] || fail "/api/auth/me/ after sign-in"
pass "session cookie authenticates /api/auth/me/"

count="$(get '/api/transactions/?limit=50' | json 'len(d)')"
[ "$count" -gt 0 ] || fail "demo account has no transactions (run manage.py seed_demo)"
pass "transactions load ($count)"

[ "$(get /api/subscriptions/ | json 'len(d["results"] if isinstance(d, dict) else d)')" -gt 0 ] || fail "subscriptions"
pass "subscriptions load"

verdict="$(post /api/purchase-check/ '{"item":"Headphones","amount":"199","category":"shopping"}' | json 'd["verdict"]')"
case "$verdict" in buy|wait|skip) pass "purchase check verdict: $verdict" ;; *) fail "purchase check: $verdict" ;; esac

convo="$(post /api/ai/conversations/ '{"context_type":"general","title":"smoke"}' | json 'd.get("conversation_id") or d["id"]')"
answer="$(post "/api/ai/conversations/$convo/messages/" '{"content":"Which subscription gives me the least value?"}' | json 'd["assistant_message"]["content"]')"
echo "$answer" | grep -q "/150" || fail "ZappBot answer did not use value scores: $answer"
pass "ZappBot answers from the user's data"

email="smoke-$(date +%s)-$RANDOM@example.com"
signup="$(post /api/waitlist-signups/ "{\"name\":\"Smoke\",\"email\":\"$email\",\"source\":\"smoke_test\"}")"
[ "$(echo "$signup" | json 'd.get("created")')" = "True" ] || fail "waitlist signup: $signup"
pass "public waitlist signup"

echo "All smoke checks passed."
