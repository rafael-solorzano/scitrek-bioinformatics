# Deploying SciTrek on Render

This is the platform deployment path. The Compose/nginx topology in
`docs/deployment.md` is unchanged and remains the EC2 path; nothing here
replaces it.

## What this costs

Every resource in the blueprint is on a free plan.

| Service | Plan | Cost | Why |
| --- | --- | --- | --- |
| `scitrek-web` (static site) | free | $0 | |
| `scitrek-api` (web) | free | $0 | Spins down after 15 minutes idle; the next request waits roughly a minute. |
| Postgres (on Neon, not Render) | free | $0 | Not a Render resource. Render deletes a free Postgres instance 30 days after creation, so the database lives elsewhere — see [Database on Neon](#database-on-neon). |
| `scitrek-keyvalue` | free | $0 | No persistence on the free plan. |

Two consequences follow from the free plans rather than from the code:
`preDeployCommand` requires a paid web service, so migrations run at startup
(`RUN_MIGRATIONS_ON_START=1`) instead; and there is no Celery worker, because
**Render has no free instance type for background workers**.

## Database on Neon

Render's free Postgres is deleted 30 days after creation, with a 14-day grace
period — a trial, not a deployment. The blueprint therefore declares no
`databases:` block, and Postgres runs on [Neon](https://neon.tech) instead: its
free tier has no expiry, and an idle project suspends its compute and wakes on
the next connection rather than needing a manual restore (which is what rules out
Supabase's free tier, where a project pauses after 7 days of no connections and
this deployment can easily go a week untouched).

Nothing in the application knows the difference. Production settings read five
discrete `DATABASE_*` variables and force `sslmode=require`
(`settings/production.py`), which is exactly what Neon serves.

Setting it up:

1. Create a Neon project — Postgres 16 or 17, region `AWS us-west-2 (Oregon)` to
   sit next to `scitrek-api`. Note the database and role names it creates.
2. Copy the **pooled** connection string (Dashboard → Connect, host contains
   `-pooler`). The pooler matters: each gunicorn worker holds a connection for
   `DATABASE_CONN_MAX_AGE` seconds, and going through the pooler is what lets
   the compute scale to zero while the service is idle.
3. Split it into `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_NAME` /
   `DATABASE_USER` / `DATABASE_PASSWORD` on the `scitrek-api` service. `?sslmode`
   and `&channel_binding` from the query string are dropped —
   `DATABASE_SSLMODE=require` in the env group already covers it.

Free-tier limits worth knowing: 0.5 GB storage and roughly 190 compute-hours per
month, both far above what a classroom deployment uses, and 5 GB of egress.

### Moving an existing Render database to Neon

`RUN_MIGRATIONS_ON_START=1` means a bare Neon database boots into a working
schema on the next deploy, so this is only needed to keep existing rows.

`pg_dump` refuses to dump from a server newer than itself, and Render runs
Postgres 16, so a Homebrew `postgresql@14` is not enough:

```bash
brew install postgresql@17
export PATH="$(brew --prefix postgresql@17)/bin:$PATH"

# External Database URL from the scitrek-postgres page; pooled URL from Neon.
pg_dump --no-owner --no-privileges --no-acl -Fc \
  -d "$RENDER_DATABASE_URL" -f scitrek.dump

pg_restore --no-owner --no-privileges --clean --if-exists \
  -d "$NEON_DATABASE_URL" scitrek.dump
```

`--no-owner`/`--no-privileges` drop the `scitrek` role grants, which do not exist
on Neon and are not needed — the Neon role owns everything it restores. Verify
before switching the service over:

```bash
psql -d "$NEON_DATABASE_URL" -c '\dt' -c 'select count(*) from auth_user;'
```

Then set the five variables, redeploy, confirm the app works, and only then
delete `scitrek-postgres` in Render. Deleting the Render database is manual:
removing it from the blueprint stops Render managing it, it does not destroy it.

## Running without a worker

`CELERY_TASK_ALWAYS_EAGER=1` makes each task run inline in the process that
triggered it. For three of this application's four tasks that is simply correct
— parsing a workbook and seeding an inbox need to *happen*, not to happen
elsewhere. The costs are that a workbook upload holds its request open for the
few seconds the PDF takes to parse, and that a task failure is no longer
retried.

The fourth is different. `schedule_message_task` is enqueued with an `eta`, and
eager execution ignores an `eta` — a message a teacher scheduled for Friday
would send the instant they saved it. So `SCHEDULED_MESSAGE_SWEEP=1` changes who
delivers it:

| | Worker topology | Sweep topology |
| --- | --- | --- |
| On create | `apply_async(eta=...)`; the worker holds the task | Nothing is enqueued; the row is the schedule |
| Delivery | The worker fires at `eta` | `manage.py send_due_messages` sends what is due |
| Trigger | The worker's own clock | `POST /internal/run-due-messages/`, every 10 minutes from `.github/workflows/scheduled-messages.yml` |
| Resolution | To the second | To the sweep period, and later if GitHub's scheduler is lagging |

`send_due_messages` is idempotent and locks each row with `skip_locked`, so
overlapping runs divide the work rather than double-sending, and a missed run
delays a message instead of losing it. The endpoint returns 404 unless
`TASK_RUNNER_TOKEN` is set, and 403 unless the caller presents it in
`X-Task-Token`.

To move to a real worker later: add a `worker` service to the blueprint running
`celery -A scitrek_backend worker`, set `CELERY_TASK_ALWAYS_EAGER=0` and
`SCHEDULED_MESSAGE_SWEEP=0`, and disable the GitHub workflow. No application
code changes.

### GitHub Actions setup

Two repository secrets, under Settings → Secrets and variables → Actions:

| Secret | Value |
| --- | --- |
| `TASK_RUNNER_URL` | `https://<backend-host>.onrender.com/internal/run-due-messages/` |
| `TASK_RUNNER_TOKEN` | the same random string as the `TASK_RUNNER_TOKEN` env var on `scitrek-api` |

GitHub disables scheduled workflows after 60 days without repository activity,
and its scheduler runs late under load. Both delay a message; neither loses one.
The 10-minute ping also keeps the free web service from spinning down, which
removes the cold start for everyone else.

## The blueprint

[`render.yaml`](../render.yaml) at the repository root declares all five
resources. Applying it creates them together and wires the database and Key
Value connection details automatically. Everything marked `sync: false` in that
file has to be entered in the dashboard — those are the secrets and the values
that depend on the hostnames Render assigns.

Two details in the blueprint are worth checking on the first deploy rather than
assuming:

- The static site rewrites `/api/*`, `/admin/*`, and `/static/*` to the backend
  so the browser only ever talks to one origin. The destinations hard-code
  `https://scitrek-api.onrender.com`; if the service is created under a
  different name, update them. Render's documentation confirms a rewrite
  destination may be a full external URL and that `*` carries the captured path
  through, but it does not state which `Host` header the rewrite forwards —
  which is why `DJANGO_ALLOWED_HOSTS` should list the static site's hostname
  and the backend's own hostname is appended automatically. That covers either
  behaviour.
- The static site declares its own Content-Security-Policy and
  Permissions-Policy. A static site has no application layer to emit them, so
  the policy strings appear in three places now — `base.py`, the nginx snippet,
  and `render.yaml` — and a test asserts all three agree.

## Why the configuration differs from Compose

| Compose assumption | On Render |
| --- | --- |
| nginx terminates TLS and adds CSP/Permissions-Policy | No nginx. Django emits both headers via `SECURITY_HEADERS_FROM_APP=1`, and the static site declares its own. |
| web and worker share a media volume | Disks cannot be shared between services, so media must live in S3-compatible object storage (`MEDIA_STORAGE_BACKEND=s3`). |
| a one-shot service migrates and collects static into a shared volume | There is no one-shot service and no shared volume, and a pre-deploy command needs a paid plan, so the web instance migrates and collects its own static at startup. |
| the container binds port 8000 | The platform assigns `$PORT`, which `start-web.sh` reads. |
| health checks come through nginx with `X-Forwarded-Proto: https` | Platform checks arrive over plain HTTP, so the health endpoints are in `SECURE_REDIRECT_EXEMPT`. |

## One-off admin commands

A free web service has no shell, so `createsuperuser` and anything else one-off
cannot be run on the instance. Neon accepts external connections, so run the
command locally against it:

```bash
export RENDER_DATABASE_URL='<pooled connection string from Neon>'
export DJANGO_SECRET_KEY='<the value in the scitrek-shared env group>'
scripts/render-manage.sh createsuperuser
```

`scripts/render-manage.sh` splits that URL into the five `DATABASE_*` variables
production settings require and supplies placeholders for the broker and media
settings, which fail-fast demands but no admin command touches. It is pointed at
production data and has no confirmation prompt.

The first login page a fresh deployment needs is `/admin/`, and guest login
additionally needs a `Classroom` named `1001` (`GUEST_CLASSROOM_NAME`) to exist
— without it the guest endpoint 404s.

## Environment variable checklist

Production settings **fail fast**: a missing required variable raises
`ImproperlyConfigured` and the service will not boot. Set all of these before the
first deploy.

### Required — the service will not start without them

| Variable | Value | Notes |
| --- | --- | --- |
| `DJANGO_SETTINGS_MODULE` | `scitrek_backend.settings.production` | |
| `DJANGO_SECRET_KEY` | 50+ random characters | Rejected below 50 characters or if it contains `change-me`. Must not be a value ever committed to Git. |
| `DJANGO_ALLOWED_HOSTS` | your public hostname(s), comma-separated | The platform hostname is appended automatically from `RENDER_EXTERNAL_HOSTNAME`. |
| `DATABASE_NAME` | from the Neon connection string | |
| `DATABASE_USER` | from the Neon connection string | |
| `DATABASE_PASSWORD` | from the Neon connection string | Secret. |
| `DATABASE_HOST` | from the Neon connection string | Use the pooled host, the one containing `-pooler`. |
| `DATABASE_SSLMODE` | `require` | Only `require`, `verify-ca`, or `verify-full` are accepted. |
| `CELERY_BROKER_URL` | Redis/Key Value URL | See the database-number note below. |
| `CELERY_RESULT_BACKEND` | Redis/Key Value URL | |
| `REDIS_CACHE_URL` | Redis/Key Value URL | Backs the shared login/signup throttles. |
| `SECURITY_HEADERS_FROM_APP` | `1` | Required with no default. `1` because there is no edge proxy here; `0` is correct only for the nginx topology. |

### Required when using object storage

| Variable | Value |
| --- | --- |
| `MEDIA_STORAGE_BACKEND` | `s3` |
| `MEDIA_S3_BUCKET` | bucket name — the bucket must be private |
| `MEDIA_S3_ACCESS_KEY_ID` | scoped to that bucket only |
| `MEDIA_S3_SECRET_ACCESS_KEY` | secret |
| `MEDIA_S3_ENDPOINT_URL` | empty for AWS S3; `https://<account-id>.r2.cloudflarestorage.com` for Cloudflare R2; `https://s3.<region>.backblazeb2.com` for Backblaze B2 |
| `MEDIA_S3_REGION` | `auto` for R2; the bucket's region for B2 and S3 |

Both the web service and the worker need every `MEDIA_S3_*` value: the web
service stores the upload and the worker reads it back.

### Optional, with safe defaults

| Variable | Default | Set it when |
| --- | --- | --- |
| `CSRF_TRUSTED_ORIGINS` | empty | Always set this to `https://<your-domain>`; Django admin logins fail without it. |
| `CORS_ALLOWED_ORIGINS` | empty | Only if the frontend is served from a different origin than the API. The recommended same-origin rewrite makes this unnecessary. |
| `TRUSTED_PROXY_COUNT` | `1` | Governs which forwarded IP the throttles trust. |
| `GUNICORN_WORKERS` | `3` | Lower it on a small instance. |
| `MEDIA_S3_ADDRESSING_STYLE` | `virtual` | `path` if the provider requires path-style requests. |
| `MEDIA_S3_URL_EXPIRE_SECONDS` | `300` | Signed-URL lifetime. |
| `COLLECT_STATIC_ON_START` | `1` | Set `0` only if static files are baked into the image instead. |
| `RUN_MIGRATIONS_ON_START` | `0` | `1` on the web service here, because a free plan has no pre-deploy command. Leave at `0` for Compose and on the worker: only one service may own migration. |
| `GUEST_LOGIN_ENABLED` | off | Leave off unless a demo classroom is wanted. |
| `PUBLIC_SIGNUP_ENABLED` | off | Leave off until an approved join policy exists. |
| `DATABASE_PORT` | `5432` | |
| `DATABASE_CONN_MAX_AGE` | `60` | |

`PORT` is injected by the platform; do not set it yourself.

## Redis database numbers

The application uses three logical Redis databases: `0` for the Celery broker,
`1` for Celery results, and `2` for the Django cache. Use three separate
databases if the managed offering supports them.

If only database `0` is available, all three URLs can share it. Celery's broker
and result keys and Django's cache keys use distinct key patterns, so they
coexist. The one real hazard is that Django's Redis cache implements `clear()` as
a full database flush, which on a shared database would also discard queued
Celery messages. Application code never calls `cache.clear()` outside tests, so
this is a constraint to be aware of rather than an active bug — but it is a reason
to prefer separate databases where the provider allows it.
