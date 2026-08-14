#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-${BASE_URL:-}}"
if [[ -z "$base_url" ]]; then
  echo "Usage: $0 https://deployment.example" >&2
  exit 2
fi
base_url="${base_url%/}"

curl_args=(--fail --silent --show-error --location --connect-timeout 5 --max-time 20)
if [[ "${SMOKE_INSECURE_TLS:-0}" == "1" ]]; then
  curl_args+=(--insecure)
fi

tmp_headers="$(mktemp)"
trap 'rm -f "$tmp_headers"' EXIT

curl "${curl_args[@]}" --dump-header "$tmp_headers" --output /dev/null "$base_url/"
for header in strict-transport-security x-content-type-options content-security-policy; do
  if ! grep -qi "^${header}:" "$tmp_headers"; then
    echo "Missing required response header: $header" >&2
    exit 1
  fi
done

curl "${curl_args[@]}" --output /dev/null "$base_url/healthz/"
curl "${curl_args[@]}" --output /dev/null "$base_url/readyz/"
curl "${curl_args[@]}" --output /dev/null "$base_url/api/health/"

auth_status="$(curl "${curl_args[@]}" --output /dev/null --write-out '%{http_code}' \
  --header 'Content-Type: application/json' \
  --data '{}' "$base_url/api/token/" || true)"
if [[ "$auth_status" != "400" && "$auth_status" != "401" ]]; then
  echo "Unexpected empty-login response: HTTP $auth_status" >&2
  exit 1
fi

echo "Smoke checks passed for $base_url"
