#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 DOMAIN EMAIL [ADDITIONAL_DOMAIN]" >&2
}

if (( $# < 2 || $# > 3 )); then
  usage
  exit 2
fi

domain="$1"
email="$2"
additional_domain="${3:-}"

if [[ ! "$domain" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then
  echo "Invalid certificate domain." >&2
  exit 2
fi
if [[ -n "$additional_domain" && ! "$additional_domain" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then
  echo "Invalid additional certificate domain." >&2
  exit 2
fi
if [[ "$email" != *@* ]]; then
  echo "Invalid contact email." >&2
  exit 2
fi

compose=(docker compose)
if [[ -n "${COMPOSE_ENV_FILE:-}" ]]; then
  compose+=(--env-file "$COMPOSE_ENV_FILE")
fi

export TLS_DOMAIN="$domain"
export TLS_WWW_DOMAIN="$additional_domain"

if ! "${compose[@]}" exec -T nginx test -f "/etc/letsencrypt/.scitrek-bootstrap-$domain"; then
  echo "No bootstrap certificate marker found; refusing to replace an existing certificate." >&2
  exit 1
fi

"${compose[@]}" stop certbot >/dev/null 2>&1 || true

restore_on_failure() {
  local exit_code=$?
  trap - EXIT
  if (( exit_code != 0 )); then
    echo "Certificate issuance failed; restoring the short-lived bootstrap certificate." >&2
    "${compose[@]}" exec -T nginx sh -c '
      set -eu
      domain="$1"
      live_dir="/etc/letsencrypt/live/$domain"
      bootstrap_dir="/etc/letsencrypt/bootstrap/$domain"
      mkdir -p "$live_dir"
      ln -sf "$bootstrap_dir/fullchain.pem" "$live_dir/fullchain.pem"
      ln -sf "$bootstrap_dir/privkey.pem" "$live_dir/privkey.pem"
    ' _ "$domain" >/dev/null 2>&1 || true
    "${compose[@]}" restart nginx >/dev/null 2>&1 || true
    "${compose[@]}" up -d certbot >/dev/null 2>&1 || true
  fi
  exit "$exit_code"
}
trap restore_on_failure EXIT

"${compose[@]}" exec -T nginx sh -c '
  set -eu
  domain="$1"
  live_dir="/etc/letsencrypt/live/$domain"
  rm -f "$live_dir/fullchain.pem" "$live_dir/privkey.pem"
  rmdir "$live_dir"
' _ "$domain"

certbot_args=(
  certonly
  --webroot
  --webroot-path /var/www/certbot
  --cert-name "$domain"
  --domain "$domain"
  --email "$email"
  --agree-tos
  --no-eff-email
  --non-interactive
)
if [[ -n "$additional_domain" ]]; then
  certbot_args+=(--domain "$additional_domain")
fi

"${compose[@]}" run --rm --no-deps --entrypoint certbot certbot "${certbot_args[@]}"
"${compose[@]}" exec -T nginx nginx -s reload
"${compose[@]}" exec -T nginx sh -c '
  set -eu
  domain="$1"
  rm -f "/etc/letsencrypt/.scitrek-bootstrap-$domain"
  rm -f "/etc/letsencrypt/bootstrap/$domain/fullchain.pem" \
        "/etc/letsencrypt/bootstrap/$domain/privkey.pem"
  rmdir "/etc/letsencrypt/bootstrap/$domain" 2>/dev/null || true
' _ "$domain"
"${compose[@]}" up -d certbot

trap - EXIT
echo "Certificate installed for $domain and renewal service started."
