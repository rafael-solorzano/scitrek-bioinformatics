# Deploying SciTrek on Render

This is the platform deployment path. The Compose/nginx topology in
`docs/deployment.md` is unchanged and remains the EC2 path; nothing here
replaces it.

## Why the configuration differs from Compose

| Compose assumption | On Render |
| --- | --- |
| nginx terminates TLS and adds CSP/Permissions-Policy | No nginx. Django emits both headers via `SECURITY_HEADERS_FROM_APP=1`, and the static site declares its own. |
| web and worker share a media volume | Disks cannot be shared between services, so media must live in S3-compatible object storage (`MEDIA_STORAGE_BACKEND=s3`). |
| a one-shot service migrates and collects static into a shared volume | Migrations run as a pre-deploy command; each web instance collects its own static at startup. |
| the container binds port 8000 | The platform assigns `$PORT`, which `start-web.sh` reads. |
| health checks come through nginx with `X-Forwarded-Proto: https` | Platform checks arrive over plain HTTP, so the health endpoints are in `SECURE_REDIRECT_EXEMPT`. |

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
| `DATABASE_NAME` | from the managed database | |
| `DATABASE_USER` | from the managed database | |
| `DATABASE_PASSWORD` | from the managed database | Secret. |
| `DATABASE_HOST` | from the managed database | |
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
