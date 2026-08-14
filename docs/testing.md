# Testing and CI

Use targeted tests while changing a subsystem. Run the full matrix at a major
milestone and before release.

## Backend

CI runs Django against PostgreSQL and Redis with
`scitrek_backend.settings.e2e`:

```bash
python manage.py makemigrations --check --dry-run
python manage.py migrate --noinput
coverage run manage.py test
coverage report
```

Coverage is branch-aware with an 85% gate over application logic. Migrations,
tests, settings variants, URL/ASGI/WSGI glue, and the development-only seed
command are excluded; application views and forms remain measured. Production
settings have a separate `manage.py check --deploy` gate.

## Frontend and mocked browser regression

```bash
cd frontend/scitrek-frontend
npm ci
npm run coverage
npm run build
npm run verify-sitemap
npm run e2e:mocked
```

Vitest enforces explicit statement, branch, function, and line floors. The
mocked Playwright suite runs desktop and mobile Chromium and remains fast; it
does not count as persistence evidence.

## Real full-stack browser tests

From the repository root:

```bash
docker compose -f docker-compose.e2e.yml up -d --build --wait web worker
cd frontend/scitrek-frontend
npm ci
npx playwright install chromium
npm run e2e:fullstack
cd ../..
docker compose -f docker-compose.e2e.yml down --volumes --remove-orphans
```

This stack is isolated as `scitrek-e2e`, uses PostgreSQL and Redis, migrates a
fresh database, and permits destructive seed reset only when both the explicit
opt-in and an E2E-named database are present. The browser suite verifies
student save/reload persistence, inbox persistence, cross-role teacher/student
authorization, and serious/critical axe violations on core pages.
CI also starts a real Celery worker and verifies that web-created media is
visible in the worker's shared volume.

CI also audits locked dependencies, validates all Compose variants, builds the
production images, rejects tracked secrets/runtime artifacts, and uploads
Playwright traces, screenshots, and videos on failure.
