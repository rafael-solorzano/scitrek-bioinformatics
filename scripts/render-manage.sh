#!/usr/bin/env bash
# Run a Django management command on your machine against the Render database.
#
# Render's free plan has no shell into the running service, so one-off admin
# work -- creating the first superuser, opening a dbshell -- has to be driven
# from outside. The database accepts external connections, so this points a
# local Django at it.
#
# Usage:
#   export RENDER_DATABASE_URL='postgresql://user:pass@ep-xxx-pooler.us-west-2.aws.neon.tech/dbname'
#   export DJANGO_SECRET_KEY='<the same value as the Render env group>'
#   scripts/render-manage.sh createsuperuser
#
# The database is on Neon, not Render -- Render deletes a free Postgres instance
# after 30 days. Copy the pooled connection string from the Neon dashboard's
# Connect panel. The variable keeps its name because it is the Render deploy's
# database; see the "Database on Neon" section of docs/render-deployment.md.
#
# This talks to production data. There is no confirmation prompt and no undo.
set -euo pipefail

if [ $# -eq 0 ]; then
  echo "usage: $0 <manage.py command> [args...]" >&2
  exit 2
fi

: "${RENDER_DATABASE_URL:?set RENDER_DATABASE_URL to the External Database URL from Render}"
: "${DJANGO_SECRET_KEY:?set DJANGO_SECRET_KEY to the value in the scitrek-shared env group}"

# Pull the five pieces production settings ask for out of the one URL Render
# gives you, rather than making the caller split it by hand.
eval "$(python3 - "$RENDER_DATABASE_URL" <<'PY'
import sys
from urllib.parse import urlsplit, unquote

url = urlsplit(sys.argv[1])
if url.scheme not in {'postgres', 'postgresql'}:
    sys.exit(f'not a postgres URL: {url.scheme or "(no scheme)"}')
if not url.hostname or not url.username:
    sys.exit('URL is missing a host or user; copy the External Database URL exactly')

fields = {
    'DB_HOST': url.hostname,
    'DB_PORT': str(url.port or 5432),
    'DB_NAME': url.path.lstrip('/'),
    'DB_USER': unquote(url.username),
    'DB_PASSWORD': unquote(url.password or ''),
}
for key, value in fields.items():
    # shlex-style quoting so a password with shell metacharacters survives.
    print(f"{key}='{value.replace(chr(39), chr(39) + chr(92) + chr(39) + chr(39))}'")
PY
)"

echo "Connecting to ${DB_NAME} on ${DB_HOST} as ${DB_USER}" >&2

cd "$(dirname "$0")/../backend/scitrek_backend"

# The Redis and media values are placeholders. Production settings fail fast on
# a missing variable, so they have to be present, but no admin command reaches
# a broker or object storage.
DJANGO_SETTINGS_MODULE=scitrek_backend.settings.production \
DJANGO_SECRET_KEY="$DJANGO_SECRET_KEY" \
DJANGO_ALLOWED_HOSTS="${DJANGO_ALLOWED_HOSTS:-scitrek-web.onrender.com}" \
DATABASE_ENGINE=postgresql \
DATABASE_SSLMODE=require \
DATABASE_HOST="$DB_HOST" \
DATABASE_PORT="$DB_PORT" \
DATABASE_NAME="$DB_NAME" \
DATABASE_USER="$DB_USER" \
DATABASE_PASSWORD="$DB_PASSWORD" \
CELERY_BROKER_URL=redis://placeholder:6379/0 \
CELERY_RESULT_BACKEND=redis://placeholder:6379/1 \
REDIS_CACHE_URL=redis://placeholder:6379/2 \
SECURITY_HEADERS_FROM_APP=1 \
MEDIA_STORAGE_BACKEND=filesystem \
"${PYTHON:-python3}" manage.py "$@"
