#!/usr/bin/env sh
set -eu

base_url="${1:-http://127.0.0.1:8080}"
headers_file="$(mktemp)"
body_file="$(mktemp)"
trap 'rm -f "$headers_file" "$body_file"' EXIT

status="$(
  curl -sS \
    -D "$headers_file" \
    -o "$body_file" \
    -w '%{http_code}' \
    "$base_url/metrics"
)"
test "$status" = "200"
grep -Eiq '^content-type:[[:space:]]*text/plain;[[:space:]]*version=0\.0\.4' "$headers_file"
grep -q '^# TYPE eventsapp_http_requests_total counter$' "$body_file"
grep -q '^eventsapp_http_requests_total ' "$body_file"
if grep -Eiq '<!doctype html|<html' "$body_file"; then
  echo "/metrics returned SPA HTML" >&2
  exit 1
fi

for path in / /health/live /health/ready /api/v1/events; do
  status="$(curl -sS -o /dev/null -w '%{http_code}' "$base_url$path")"
  test "$status" = "200"
done

status="$(
  curl -sS \
    -H 'Accept: text/html' \
    -o "$body_file" \
    -w '%{http_code}' \
    "$base_url/client-side-route"
)"
test "$status" = "200"
grep -Eiq '<!doctype html|<html' "$body_file"

echo "proxy smoke passed: SPA, API, health, and Prometheus metrics"
