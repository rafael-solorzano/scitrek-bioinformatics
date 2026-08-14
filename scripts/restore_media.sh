#!/usr/bin/env bash
set -euo pipefail

if (( $# != 1 )); then
  echo "Usage: $0 MEDIA_BACKUP.tar.gz" >&2
  exit 2
fi
archive="$1"
if [[ ! -f "$archive" ]]; then
  echo "Media backup does not exist: $archive" >&2
  exit 2
fi
if [[ "${MEDIA_RESTORE_CONFIRM:-}" != "restore-empty-media-data" ]]; then
  echo "Set MEDIA_RESTORE_CONFIRM=restore-empty-media-data to confirm." >&2
  exit 1
fi

compose=(docker compose)
if [[ -n "${COMPOSE_ENV_FILE:-}" ]]; then
  compose+=(--env-file "$COMPOSE_ENV_FILE")
fi
if [[ -n "$("${compose[@]}" ps -q web worker)" ]]; then
  echo "Stop web and worker before restoring media." >&2
  exit 1
fi

archive_dir="$(cd "$(dirname "$archive")" && pwd)"
archive_name="$(basename "$archive")"
"${compose[@]}" run --rm --no-deps --user root \
  --volume "$archive_dir:/backup:ro" \
  --entrypoint sh web -c '
    set -eu
    if [ -n "$(find /app/media -mindepth 1 -print -quit)" ]; then
      echo "Refusing to restore into non-empty media-data." >&2
      exit 1
    fi
    tar -C /app/media -xzf "/backup/$1"
    chown -R scitrek:scitrek /app/media
  ' _ "$archive_name"

echo "Media restored into the empty media-data volume. Run the documented integrity checks."
