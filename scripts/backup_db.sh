#!/usr/bin/env bash
set -euo pipefail

for name in DATABASE_HOST DATABASE_NAME DATABASE_USER DATABASE_PASSWORD; do
  if [[ -z "${!name:-}" ]]; then
    echo "$name must be exported before running this script." >&2
    exit 2
  fi
done

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required on the operator host." >&2
  exit 2
fi

backup_dir="${BACKUP_DIR:-backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="$backup_dir/scitrek_${timestamp}.dump"

umask 077
mkdir -p "$backup_dir"

PGPASSWORD="$DATABASE_PASSWORD" \
PGSSLMODE="${DATABASE_SSLMODE:-require}" \
  pg_dump \
    --host "$DATABASE_HOST" \
    --port "${DATABASE_PORT:-5432}" \
    --username "$DATABASE_USER" \
    --dbname "$DATABASE_NAME" \
    --format custom \
    --no-owner \
    --file "$backup_path"

echo "Backup written to $backup_path"
