#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  echo "Usage: $0 BACKUP_FILE" >&2
  exit 2
fi
backup_path="$1"

for name in DATABASE_HOST DATABASE_NAME DATABASE_USER DATABASE_PASSWORD RESTORE_DATABASE_NAME; do
  if [[ -z "${!name:-}" ]]; then
    echo "$name must be exported before running this script." >&2
    exit 2
  fi
done

if [[ ! -f "$backup_path" ]]; then
  echo "Backup file does not exist: $backup_path" >&2
  exit 2
fi
if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required on the operator host." >&2
  exit 2
fi
if [[ "$DATABASE_NAME" == "$RESTORE_DATABASE_NAME" ]]; then
  echo "Refusing to restore into DATABASE_NAME; use an empty disposable database." >&2
  exit 1
fi
if [[ "${RESTORE_CONFIRM:-}" != "$RESTORE_DATABASE_NAME" ]]; then
  echo "Set RESTORE_CONFIRM exactly to RESTORE_DATABASE_NAME to confirm the target." >&2
  exit 1
fi

PGPASSWORD="$DATABASE_PASSWORD" \
PGSSLMODE="${DATABASE_SSLMODE:-require}" \
  pg_restore \
    --host "$DATABASE_HOST" \
    --port "${DATABASE_PORT:-5432}" \
    --username "$DATABASE_USER" \
    --dbname "$RESTORE_DATABASE_NAME" \
    --exit-on-error \
    --no-owner \
    -- "$backup_path"

echo "Restore completed into $RESTORE_DATABASE_NAME. Run the documented integrity checks before use."
