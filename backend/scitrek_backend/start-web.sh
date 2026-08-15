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

# Compose runs migrations in a one-shot service, and a paid platform plan can
# run them as a pre-deploy command. Neither exists on a free plan, so the web
# instance has to apply them itself. Default off: the Compose path must not
# migrate from inside the serving container.
if [[ "${RUN_MIGRATIONS_ON_START:-0}" == "1" ]]; then
  python manage.py migrate --noinput
fi

# In the Compose topology a one-shot migrate service collects static into a
# volume shared with web. A platform without shared volumes gives each instance
# its own filesystem, and a pre-deploy command runs somewhere else again, so this
# instance has to collect its own or whitenoise serves an unstyled Django admin.
if [[ "${COLLECT_STATIC_ON_START:-1}" == "1" ]]; then
  python manage.py collectstatic --noinput
fi

exec gunicorn scitrek_backend.wsgi:application \
  --bind "0.0.0.0:${port}" \
  --workers "${workers}" \
  --access-logfile - \
  --error-logfile - \
  --capture-output
