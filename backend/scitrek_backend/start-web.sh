#!/usr/bin/env bash
# Default web command. Platforms that assign a port at runtime (Render sets
# $PORT) need the bind address resolved by a shell, which the image's exec-form
# CMD cannot do. Compose passes an explicit command instead, so this script only
# runs on the platform path.
set -euo pipefail

port="${PORT:-8000}"
if [[ ! "$port" =~ ^[1-9][0-9]*$ ]] || (( port > 65535 )); then
  echo "PORT must be a valid TCP port number, got: ${port}" >&2
  exit 2
fi

workers="${GUNICORN_WORKERS:-3}"
if [[ ! "$workers" =~ ^[1-9][0-9]*$ ]]; then
  echo "GUNICORN_WORKERS must be a positive integer, got: ${workers}" >&2
  exit 2
fi

exec gunicorn scitrek_backend.wsgi:application \
  --bind "0.0.0.0:${port}" \
  --workers "${workers}" \
  --access-logfile - \
  --error-logfile - \
  --capture-output
