#!/usr/bin/env bash
set -euo pipefail

tracked="$(
  git ls-files |
    grep -E '(^|/)(\.env($|\.)|.*\.(sqlite3?|db|rdb)$|celerybeat-schedule($|\.)|id_(rsa|dsa|ecdsa|ed25519)$|.*\.(pem|key|p12|pfx)$|__pycache__/|.*\.py[co]$|media/|staticfiles/|build/|dist/|coverage/|playwright-report/|test-results/)' |
    grep -vE '(^|/)\.env[^/]*\.example$' || true
)"

if [[ -n "$tracked" ]]; then
  echo "Tracked runtime, env, media, or build artifacts found:"
  echo "$tracked"
  exit 1
fi

credential_pattern='AKIA[0-9A-Z]{16}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|sk_live_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'
credential_files="$(
  git grep -I -l -E "$credential_pattern" -- . \
    ':(exclude)*.example' \
    ':(exclude)package-lock.json' 2>/dev/null || true
)"

if [[ -n "$credential_files" ]]; then
  echo "High-confidence credential material found in tracked files (values redacted):" >&2
  echo "$credential_files" >&2
  exit 1
fi

echo "No tracked runtime artifacts or high-confidence credential patterns found."
