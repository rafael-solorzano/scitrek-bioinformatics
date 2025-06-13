#!/usr/bin/env bash
set -e

# wait for Postgres
until nc -z "$DATABASE_HOST" "$DATABASE_PORT"; do
  echo "Waiting for DB at $DATABASE_HOST:$DATABASE_PORT..."
  sleep 1
done

# 1. migrate
python manage.py migrate --noinput

# 2. seed
python manage.py seed_inbox

# 3. start Gunicorn
exec gunicorn scitrek_backend.wsgi:application \
     --bind 0.0.0.0:8000 \
     --workers 3 \
     --log-level info
