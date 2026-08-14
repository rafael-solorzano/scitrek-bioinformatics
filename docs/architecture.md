# Architecture

SciTrek is a React single-page application backed by a Django REST API. The
supported production topology is:

```text
browser -> nginx (TLS, SPA, /api proxy) -> Gunicorn/Django -> managed PostgreSQL
                                      \-> Redis -> Celery worker
web + worker -> private shared media volume
```

nginx serves the Vite build, proxies `/api/`, `/admin/`, liveness, and
readiness, and serves collected Django static files. It does not serve
`/media/`: student responses and message attachments can be private. Django
streams authorized files through scoped API endpoints; frontend images are
fetched with the authenticated API client. The web and worker containers share
the persistent media volume so workbook parsing does not depend on a
container-local filesystem. A future multi-host deployment should replace that
volume with private object storage and short-lived signed downloads.

Production PostgreSQL is external and managed. Development, CI, and real E2E
use disposable PostgreSQL services. Redis provides the Celery broker, result
backend, and shared Django throttle/cache state. No beat service runs because
the application has no required periodic schedule.

Startup is ordered: `init-volumes` prepares ownership; `migrate` applies schema
changes and collects static files once; web and worker start afterward. Web
restarts never seed or migrate. `/healthz/` reports process liveness and
`/readyz/` checks PostgreSQL and the configured cache/Redis backend without
returning internals.

The browser uses same-origin `/api` requests by default. `VITE_API_BASE_URL`
exists only for intentionally separate origins and must not include an `/api`
suffix. Authentication currently uses short-lived JWTs in browser storage;
the CSP, sanitized workbook HTML, staff-only content writes, and bundled
frontend assets reduce script-injection exposure.

See [deployment.md](deployment.md), [security.md](security.md), and
[backup-restore.md](backup-restore.md) for operational boundaries.
