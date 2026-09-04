# Deploying to AWS EC2 + RDS at `bioinformatics-mod.sci-trek.org`

This is the Docker Compose / nginx path from [`deployment.md`](deployment.md),
pinned to one AWS EC2 host, one AWS RDS PostgreSQL instance, and the single
hostname `bioinformatics-mod.sci-trek.org`. Read `deployment.md` for the
general contract (startup ordering, health endpoints, update and rollback
procedure); this file only covers what is AWS- and subdomain-specific.

## Topology

```
Route 53  bioinformatics-mod.sci-trek.org  A -> EC2 Elastic IP
EC2 (Docker Compose): nginx (TLS, SPA, /api proxy) -> gunicorn/Django
                      redis -> celery worker
                      web + worker share the media-data volume (on the root EBS)
RDS PostgreSQL (same VPC, private, not publicly accessible)
```

Postgres is **not** in the Compose file by design. Redis, media, and TLS state
are Docker volumes on the instance's EBS root disk.

## 1. AWS infrastructure (console or IaC — not scripted here)

### EC2

| Setting | Value |
| --- | --- |
| AMI | Ubuntu 24.04 LTS |
| Instance type | `t3.medium` — the nginx image build runs `npm run build` in-container and a 2 GB box OOMs. Alternative: build the image in CI and `docker pull` it, then `t3.small` is enough to run. |
| Root volume | 30 GB gp3 (images + `media-data` + `redis-data`) |
| Elastic IP | allocate one and associate it |
| User data / setup | install Docker Engine + the Compose plugin |

Security group `scitrek-bioinformatics-mod-ec2`:

| Direction | Port | Source |
| --- | --- | --- |
| inbound | 80 | `0.0.0.0/0` |
| inbound | 443 | `0.0.0.0/0` |
| inbound | 22 | your admin IP /32 |
| outbound | all | `0.0.0.0/0` |

### RDS

| Setting | Value |
| --- | --- |
| Engine | PostgreSQL 16 |
| Class | `db.t4g.micro` |
| Storage | 20 GB gp3, autoscaling optional |
| VPC | same as the EC2 instance |
| Subnet group | private subnets |
| Public access | No |
| Automated backups | 7+ days |
| Initial database name | `scitrek` (or leave blank and create it after) |

Security group `scitrek-bioinformatics-mod-rds`:

| Direction | Port | Source |
| --- | --- | --- |
| inbound | 5432 | the **`scitrek-bioinformatics-mod-ec2` security group** (reference the SG, not a CIDR) |

`sslmode=require` (the app default) works against RDS with no extra
configuration. `rds.force_ssl=1` in the parameter group is compatible.

After the instance is up, connect as the master user once and create the
application role and database if you did not set an initial database name:

```sql
CREATE ROLE scitrek_app LOGIN PASSWORD '<generated>';
CREATE DATABASE scitrek OWNER scitrek_app;
```

### DNS

In the zone that serves `sci-trek.org` (Route 53 or the registrar), add:

```
bioinformatics-mod   A   <EC2 Elastic IP>   TTL 300
```

No `www.bioinformatics-mod` record and no CNAME. The record must resolve before
step 3 (Let's Encrypt validates over HTTP to this address).

### Secret

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Use the output as `DJANGO_SECRET_KEY` (must be 50+ chars and must never have
been committed).

## 2. First deployment (on the EC2 host)

```bash
git clone https://github.com/rafael-solorzano/scitrek-bioinformatics.git
cd scitrek-bioinformatics
git checkout andyDeployedPost          # the branch carrying this deploy

cp backend/scitrek_backend/.env.production.example backend/scitrek_backend/.env
```

Edit `backend/scitrek_backend/.env`:

| Key | Value |
| --- | --- |
| `DJANGO_SECRET_KEY` | the generated secret |
| `DJANGO_ALLOWED_HOSTS` | `bioinformatics-mod.sci-trek.org` (already set in the example) |
| `DJANGO_HEALTHCHECK_HOST` | `bioinformatics-mod.sci-trek.org` |
| `CORS_ALLOWED_ORIGINS` | `https://bioinformatics-mod.sci-trek.org` |
| `CSRF_TRUSTED_ORIGINS` | `https://bioinformatics-mod.sci-trek.org` |
| `DATABASE_HOST` | RDS endpoint |
| `DATABASE_NAME` / `DATABASE_USER` / `DATABASE_PASSWORD` | from RDS |
| `DATABASE_SSLMODE` | `require` |
| `TLS_DOMAIN` | `bioinformatics-mod.sci-trek.org` |
| `TLS_WWW_DOMAIN` | leave empty |
| `TLS_EMAIL` | an operations mailbox for Let's Encrypt expiry notices |
| `SECURITY_HEADERS_FROM_APP` | `0` (nginx emits CSP/Permissions-Policy on this topology) |
| `MEDIA_STORAGE_BACKEND` | `filesystem` (single host — web and worker share the volume) |

Then build and start:

```bash
export COMPOSE_ENV_FILE=backend/scitrek_backend/.env
export SCITREK_IMAGE_TAG="$(git rev-parse --short=12 HEAD)"

docker compose --env-file "$COMPOSE_ENV_FILE" config --quiet
docker compose --env-file "$COMPOSE_ENV_FILE" build web nginx
docker compose --env-file "$COMPOSE_ENV_FILE" up -d redis migrate web worker nginx
docker compose --env-file "$COMPOSE_ENV_FILE" ps
```

`init-volumes` and `migrate` run once; `web` and `worker` start only after
`migrate` succeeds. Inspect `docker compose ... logs migrate` if startup blocks
(most often the RDS security group not allowing the instance, or wrong
`DATABASE_*`).

## 3. TLS

nginx comes up on a two-day self-signed bootstrap certificate so it can answer
the ACME HTTP challenge. Replace it (DNS must already resolve to this host):

```bash
COMPOSE_ENV_FILE=backend/scitrek_backend/.env \
  scripts/init_tls.sh bioinformatics-mod.sci-trek.org ops@sci-trek.org
```

No third argument — this is a single-domain certificate. The `certbot` service
then renews twice daily; nginx reloads within the hour when the file changes.

## 4. Verify

```bash
scripts/smoke_test.sh https://bioinformatics-mod.sci-trek.org
```

Checks the SPA, `/healthz/`, `/readyz/` (this exercises the RDS connection),
`/api/health/`, empty-login behaviour, and the security headers. Then walk the
manual list in [`smoke-checklist.md`](smoke-checklist.md) with a throwaway
account.

Create the admin user and, if guest login is wanted, the demo classroom:

```bash
docker compose --env-file backend/scitrek_backend/.env exec web \
  python manage.py createsuperuser
# guest login also needs GUEST_LOGIN_ENABLED=1 and a Classroom named 1001
```

## 5. Updates and rollback

Follow "Deploying an update" and the rollback steps in
[`deployment.md`](deployment.md). In short: `git pull`, re-`build`,
`docker compose ... run --rm migrate`, then
`docker compose ... up -d --no-deps web worker nginx`, then re-run the smoke
test. Take an RDS snapshot before any non-backward-compatible migration.

## Notes specific to this deployment

- **HSTS is scoped to the host.** `nginx/snippets/security-headers.conf` and
  `settings/production.py` send `Strict-Transport-Security: max-age=31536000`
  without `includeSubDomains` or `preload`, because asserting those from a
  subdomain would force HTTPS on the entire `sci-trek.org` zone. If every
  `sci-trek.org` host is already HTTPS-only and you want the zone preloaded,
  restore `; includeSubDomains; preload` in both files together.
- **Media is on EBS, not in RDS.** RDS snapshots do not include uploaded
  workbooks and message attachments. Back the `media-data` volume up separately
  with `scripts/backup_media.sh` and copy the archive off the instance.
- **A real Celery worker runs here** (unlike the Render path), so scheduled
  teacher messages are delivered by the worker at their `eta`. Leave
  `CELERY_TASK_ALWAYS_EAGER` and `SCHEDULED_MESSAGE_SWEEP` unset, and do not
  enable `.github/workflows/scheduled-messages.yml`.
- **`RUN_MIGRATIONS_ON_START` / `COLLECT_STATIC_ON_START` stay unset.** The
  `migrate` one-shot owns schema and static collection; the serving container
  must not migrate.
- **CI.** `.github/workflows/ci.yml` runs on `main` and `andyDeployedPre` only.
  Add the deploy branch to that list if you want the pipeline to gate it.
- **Outbound email is not configured** in the example env. If password reset or
  teacher email is needed, add SMTP/SES settings before going live.
