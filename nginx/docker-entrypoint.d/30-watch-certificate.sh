#!/bin/sh
set -eu

domain="${TLS_DOMAIN:?TLS_DOMAIN must be set}"
certificate="/etc/letsencrypt/live/$domain/fullchain.pem"

(
  previous=""
  while :; do
    if [ -s "$certificate" ]; then
      current="$(cksum "$certificate" | awk '{print $1 ":" $2}')"
      if [ -n "$previous" ] && [ "$current" != "$previous" ]; then
        nginx -s reload || true
      fi
      previous="$current"
    fi
    sleep 3600
  done
) &
