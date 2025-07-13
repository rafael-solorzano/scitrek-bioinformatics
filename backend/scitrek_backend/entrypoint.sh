#!/usr/bin/env bash
set -e

# wait for Postgres
until nc -z "$DATABASE_HOST" "$DATABASE_PORT"; do
  echo "Waiting for DB at $DATABASE_HOST:$DATABASE_PORT..."
  sleep 1
done

python manage.py migrate --noinput
python manage.py seed_inbox
exec gunicorn scitrek_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --log-level info

