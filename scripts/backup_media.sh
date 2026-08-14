#!/usr/bin/env bash
set -euo pipefail

backup_dir="${BACKUP_DIR:-backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
umask 077
mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd)"
backup_name="scitrek_media_${timestamp}.tar.gz"

compose=(docker compose)
if [[ -n "${COMPOSE_ENV_FILE:-}" ]]; then
  compose+=(--env-file "$COMPOSE_ENV_FILE")
fi

"${compose[@]}" run --rm --no-deps --user root \
  --volume "$backup_dir:/backup" \
  --entrypoint tar web \
  -C /app/media -czf "/backup/$backup_name" .

echo "Media backup written to $backup_dir/$backup_name"
