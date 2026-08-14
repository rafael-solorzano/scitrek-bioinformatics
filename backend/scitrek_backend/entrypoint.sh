#!/usr/bin/env bash
set -euo pipefail

if [[ "${DATABASE_ENGINE:-postgresql}" == "postgresql" ]]; then
  : "${DATABASE_HOST:?DATABASE_HOST must be set when DATABASE_ENGINE=postgresql}"
  max_attempts="${DATABASE_WAIT_MAX_ATTEMPTS:-30}"
  wait_seconds="${DATABASE_WAIT_INTERVAL_SECONDS:-2}"
  attempt=1

  if [[ ! "$max_attempts" =~ ^[1-9][0-9]*$ ]]; then
    echo "DATABASE_WAIT_MAX_ATTEMPTS must be a positive integer." >&2
    exit 2
  fi
  if [[ ! "$wait_seconds" =~ ^[1-9][0-9]*$ ]]; then
    echo "DATABASE_WAIT_INTERVAL_SECONDS must be a positive integer." >&2
    exit 2
  fi

  until python -c 'import os, socket; socket.create_connection((os.environ["DATABASE_HOST"], int(os.environ.get("DATABASE_PORT", "5432"))), timeout=2).close()'; do
    if (( attempt >= max_attempts )); then
      echo "Database did not become reachable after ${max_attempts} attempts." >&2
      exit 1
    fi
    echo "Waiting for database (${attempt}/${max_attempts})..."
    attempt=$((attempt + 1))
    sleep "$wait_seconds"
  done
fi

exec "$@"
