#!/usr/bin/env bash
# Idempotent redeploy for the EC2 + Docker Compose topology.
#
# Safe to run repeatedly and from an unattended trigger (SSM Send-Command,
# git hook, cron). It fetches the deploy branch, rebuilds only the images whose
# build inputs changed, applies migrations through the one-shot `migrate`
# service, recreates the long-running services, smoke-tests the public URL, and
# rolls the checkout back to the previous commit if the smoke test fails.
#
# Environment:
#   DEPLOY_BRANCH            branch to deploy            (default: production)
#   SCITREK_DIR              repo checkout on the host   (default: /opt/scitrek/scitrek-bioinformatics)
#   RDS_SNAPSHOT_ID_PREFIX   when set AND migration files changed, take an RDS
#                            snapshot (needs the AWS CLI and RDS_DB_INSTANCE_ID)
#                            before `migrate` runs
#   RDS_DB_INSTANCE_ID       RDS instance identifier to snapshot
#
# Rollback reverts the code only. A migration is not un-applied; if a failed
# deploy changed migration files, restore the pre-deploy RDS snapshot when the
# migration is not backward compatible (see docs/deployment.md).
set -euo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-production}"
SCITREK_DIR="${SCITREK_DIR:-/opt/scitrek/scitrek-bioinformatics}"
LOCK_FILE="${SCITREK_DEPLOY_LOCK:-/tmp/scitrek-deploy.lock}"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "deploy: another run holds $LOCK_FILE; aborting" >&2
  exit 1
fi

cd "$SCITREK_DIR"
export COMPOSE_ENV_FILE="backend/scitrek_backend/.env"
compose() { docker compose --env-file "$COMPOSE_ENV_FILE" "$@"; }

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "deploy: $SCITREK_DIR/$COMPOSE_ENV_FILE is missing" >&2
  exit 1
fi

tls_domain="$(sed -n 's/^TLS_DOMAIN=//p' "$COMPOSE_ENV_FILE" | head -1)"
: "${tls_domain:?deploy: TLS_DOMAIN not found in $COMPOSE_ENV_FILE}"
smoke_url="https://${tls_domain}"

git fetch --prune origin
old_sha="$(git rev-parse HEAD)"
new_sha="$(git rev-parse "origin/${DEPLOY_BRANCH}")"

if [[ "$old_sha" == "$new_sha" ]]; then
  echo "deploy: already at ${new_sha:0:12}; nothing to do"
  exit 0
fi

changed="$(git diff --name-only "$old_sha" "$new_sha")"
echo "deploy: ${old_sha:0:12} -> ${new_sha:0:12}"
echo "$changed" | sed 's/^/  changed: /'

# Only docs / CI / markdown touched: move the checkout forward, build nothing.
if ! echo "$changed" | grep -qvE '^(docs/|\.github/|.*\.md$)'; then
  echo "deploy: no runtime-affecting changes; fast-forwarding checkout only"
  git reset --hard "$new_sha"
  exit 0
fi

rebuild_nginx=false
if echo "$changed" | grep -qE '^(frontend/|nginx/)'; then
  rebuild_nginx=true
fi

migrations_changed=false
if echo "$changed" | grep -qE '^backend/scitrek_backend/.*/migrations/.*\.py$'; then
  migrations_changed=true
fi

deploy_at() {
  local sha="$1"
  git reset --hard "$sha"
  export SCITREK_IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
  compose build web                       # cheap when the layer cache is warm
  if [[ "$rebuild_nginx" == true ]]; then
    compose build nginx                   # slow: recompiles the Vite frontend
  fi
  compose run --rm migrate
  compose up -d --no-deps web worker nginx
}

if [[ "$migrations_changed" == true && -n "${RDS_SNAPSHOT_ID_PREFIX:-}" ]]; then
  db_instance="${RDS_DB_INSTANCE_ID:?deploy: RDS_DB_INSTANCE_ID must be set to snapshot}"
  snap="${RDS_SNAPSHOT_ID_PREFIX}-$(date -u +%Y%m%d%H%M%S)"
  echo "deploy: migrations changed; taking RDS snapshot ${snap}"
  aws rds create-db-snapshot \
    --db-instance-identifier "$db_instance" \
    --db-snapshot-identifier "$snap" >/dev/null
  aws rds wait db-snapshot-available --db-snapshot-identifier "$snap"
  echo "deploy: snapshot ${snap} available"
fi

echo "deploy: applying ${new_sha:0:12}"
deploy_at "$new_sha"

if scripts/smoke_test.sh "$smoke_url"; then
  echo "deploy: OK at ${new_sha:0:12}"
  exit 0
fi

echo "deploy: smoke test failed; rolling back to ${old_sha:0:12}" >&2
if [[ "$migrations_changed" == true ]]; then
  echo "deploy: WARNING - the failed deploy changed migrations. The code is" >&2
  echo "deploy: being rolled back but the database schema is NOT. Review before" >&2
  echo "deploy: the next deploy; restore the pre-deploy RDS snapshot if the" >&2
  echo "deploy: migration is not backward compatible." >&2
fi
deploy_at "$old_sha"
if scripts/smoke_test.sh "$smoke_url"; then
  echo "deploy: rolled back to ${old_sha:0:12}"
  exit 1
fi
echo "deploy: rollback smoke test ALSO failed; manual intervention required" >&2
exit 2
