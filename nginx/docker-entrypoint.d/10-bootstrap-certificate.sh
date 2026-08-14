#!/bin/sh
set -eu

domain="${TLS_DOMAIN:?TLS_DOMAIN must be set}"
case "$domain" in
  *[!A-Za-z0-9.-]*|.*|*..*|*.)
    echo "TLS_DOMAIN is not a valid DNS name." >&2
    exit 1
    ;;
esac

live_dir="/etc/letsencrypt/live/$domain"
bootstrap_dir="/etc/letsencrypt/bootstrap/$domain"
marker="/etc/letsencrypt/.scitrek-bootstrap-$domain"

if [ ! -s "$live_dir/fullchain.pem" ] || [ ! -s "$live_dir/privkey.pem" ]; then
  echo "Creating a short-lived bootstrap certificate for initial ACME startup."
  mkdir -p "$live_dir" "$bootstrap_dir"
  openssl req -x509 -nodes -newkey rsa:2048 -days 2 \
    -subj "/CN=$domain" \
    -keyout "$bootstrap_dir/privkey.pem" \
    -out "$bootstrap_dir/fullchain.pem" >/dev/null 2>&1
  ln -sf "$bootstrap_dir/fullchain.pem" "$live_dir/fullchain.pem"
  ln -sf "$bootstrap_dir/privkey.pem" "$live_dir/privkey.pem"
  : > "$marker"
fi
