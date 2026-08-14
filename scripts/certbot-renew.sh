#!/bin/sh
set -eu

trap 'exit 0' TERM INT

while :; do
  certbot renew --webroot --webroot-path /var/www/certbot --quiet
  sleep 43200 &
  wait $!
done
