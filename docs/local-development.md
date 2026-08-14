# Local development

Requirements: Docker Compose v2, Node 20.19.5 or newer, and npm.

Copy the safe example, then start PostgreSQL, Redis, migrations, Django, and
the Celery worker from the repository root:

```bash
cp backend/scitrek_backend/.env.dev.example backend/scitrek_backend/.env.dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build db redis migrate web worker
```

Django is available at `http://127.0.0.1:8000`. Seed deterministic development
records only when wanted:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec web python manage.py seed_dev
```

In a second terminal, start Vite:

```bash
cd frontend/scitrek-frontend
npm ci
npm run dev
```

Vite is available at `http://127.0.0.1:3000` and proxies `/api` and health
requests to Django. Leave `VITE_API_BASE_URL` empty for this same-origin-style
development path. Use `VITE_API_PROXY_TARGET` only to change the local proxy
destination.

Useful commands:

```bash
# Create and apply a schema migration
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec web python manage.py makemigrations
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm migrate

# Stop without deleting state
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Explicitly delete the development database and named volumes
docker compose -f docker-compose.yml -f docker-compose.dev.yml down --volumes --remove-orphans
```

The last command is destructive and must never be used against production.
Real browser tests use the separately named `scitrek-e2e` project and the
guarded `seed_e2e --reset` command; see [testing.md](testing.md).
