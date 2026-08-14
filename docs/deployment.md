# Production deployment

SciTrek's supported production topology is nginx/TLS, Django/Gunicorn, Redis,
and a Celery worker in Docker Compose, with PostgreSQL supplied by a managed
service. PostgreSQL is intentionally not created by the production Compose
file.

## Prerequisites

- Docker Engine with Compose v2
- DNS for the deployment names pointing at the host
- inbound TCP 80 and 443
- a managed PostgreSQL database reachable from the host
- provider-managed database backups enabled before accepting user data

Copy `backend/scitrek_backend/.env.production.example` to
`backend/scitrek_backend/.env`, replace every `change-me` value, and keep that
file outside Git. `DJANGO_HEALTHCHECK_HOST` must also appear in
`DJANGO_ALLOWED_HOSTS`. Keep `VITE_API_BASE_URL` empty for same-origin API
requests through nginx.

All Compose commands below load the same file for both service variables and
Compose-time TLS/build variables:

```bash
export COMPOSE_ENV_FILE=backend/scitrek_backend/.env
export SCITREK_IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
docker compose --env-file "$COMPOSE_ENV_FILE" config --quiet
docker compose --env-file "$COMPOSE_ENV_FILE" build web nginx
```

## First deployment

Start the application. The `init-volumes` one-shot prepares named-volume
permissions, `migrate` applies migrations and runs `collectstatic`, and web and
worker start only after migration succeeds. Web never migrates or seeds data on
restart.

```bash
docker compose --env-file "$COMPOSE_ENV_FILE" up -d redis migrate web worker nginx
docker compose --env-file "$COMPOSE_ENV_FILE" ps
```

On a new certificate volume, nginx creates a two-day self-signed bootstrap
certificate so it can serve the HTTP ACME challenge. Replace it immediately:

```bash
COMPOSE_ENV_FILE="$COMPOSE_ENV_FILE" \
  scripts/init_tls.sh sci-trek.org operations@example.org www.sci-trek.org
```

The Certbot service checks renewal twice daily. nginx watches the certificate
hourly and reloads when it changes. Test renewal after initial issuance:

```bash
docker compose --env-file "$COMPOSE_ENV_FILE" run --rm --no-deps \
  --entrypoint certbot certbot renew --dry-run
```

Do not expose the bootstrap certificate to users as a completed TLS setup.

## Health and startup behavior

- `/healthz/` and `/api/health/` are process liveness probes.
- `/readyz/` and `/api/ready/` verify PostgreSQL and Redis/cache readiness.
- the internal web health check supplies the trusted host and proxy HTTPS
  header, so Django's production HTTPS redirect does not break the probe.
- database waiting is bounded by `DATABASE_WAIT_MAX_ATTEMPTS` and
  `DATABASE_WAIT_INTERVAL_SECONDS`.
- nginx waits for readiness; worker waits for migrations and Redis.

Inspect one-shot logs when startup is blocked:

```bash
docker compose --env-file "$COMPOSE_ENV_FILE" logs migrate
docker compose --env-file "$COMPOSE_ENV_FILE" logs web worker nginx
```

## Persistent state

`media-data` is shared by web and worker so uploaded workbook parsing works
across containers and uploads survive recreation. It is deliberately not
mounted into nginx: direct `/media/` requests return 404 because message and
student uploads can contain private data. Django's authorization-scoped API
download endpoints stream permitted workbook, response, message, and section
image files with private/no-store and `nosniff` headers. `static-data` contains
collected Django static files. `redis-data` enables AOF persistence for queued
work. Certificate state is stored in `certbot-etc` and `certbot-var`.

These Docker volumes are host-local. Moving to another host requires an
explicit media migration or an object-storage design; database backup alone
does not preserve uploaded files. Treat media paths and metadata as sensitive.

## Deploying an update

Build first, then run the one-shot migration. Take a database backup before any
non-backward-compatible migration.

```bash
docker compose --env-file "$COMPOSE_ENV_FILE" build web nginx
docker compose --env-file "$COMPOSE_ENV_FILE" run --rm migrate
docker compose --env-file "$COMPOSE_ENV_FILE" up -d --no-deps web worker nginx
scripts/smoke_test.sh https://sci-trek.org
```

Use backward-compatible expand/contract migrations for zero-downtime releases.
Record `SCITREK_IMAGE_TAG`, the database backup identifier, and the migration
state for every release. For an application-only rollback with a
backward-compatible schema, select the prior locally retained/registry image
tag and recreate services without rebuilding:

```bash
export SCITREK_IMAGE_TAG=<previous-reviewed-git-sha>
docker compose --env-file "$COMPOSE_ENV_FILE" up -d --no-build --no-deps web worker nginx
scripts/smoke_test.sh https://sci-trek.org
```

If a release fails after a forward-only incompatible schema change, restore
the matching application, database, and media recovery point together using
`docs/backup-restore.md`; do not blindly reverse migrations on production data.
Compose caps each service's local JSON logs at five 10 MiB files; keep host
disk monitoring and centralized log retention in the production platform.
