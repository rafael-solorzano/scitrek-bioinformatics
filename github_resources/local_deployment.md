# SciTrek – Local Development Setup

## Requirements

- Docker Desktop installed and running  
- Node **20.19.5+** installed (recommended)
- npm installed  

---

## 1. Clone the Repository

```bash
git clone <repo-url>
cd scitrek-bioinformatics
```

---

## 2. Start the Backend (Django + PostgreSQL + Redis)

From the project root:

Create the ignored development environment file, then start PostgreSQL, Redis,
the one-shot migration, Django, and the Celery worker:

```bash
cp backend/scitrek_backend/.env.dev.example backend/scitrek_backend/.env.dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build db redis migrate web worker
```

Backend will be available at:

http://localhost:8000

---

## 3. Run Migrations

The one-shot `migrate` service applies migrations automatically before web and
worker start. To apply a newly added migration explicitly:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm migrate
```

---

## 4. Seed the Development Database

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec web python manage.py seed_dev
```

### Dev Credentials

**Teacher**
- Username: `teacher1001`
- Password: `teacher1001`

**Student**
- Username: `student1001`
- Password: `student1001`

**Classroom Code**
- `1001`

---

## 5. Start the Frontend (React)

Open a **new terminal window**:

```bash
cd frontend/scitrek-frontend
npm ci
npm start
```

Frontend will be available at:

http://127.0.0.1:3000

---

## 6. Stop Everything

### Stop Backend

Press `Ctrl + C` in the Docker terminal  
or run:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Stop Frontend

Press `Ctrl + C`

---

## 7. Reset Database (Fresh Start)

If you want a clean development database:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down --volumes --remove-orphans
```

Rebuild:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build db redis migrate web worker
```

Then run:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec web python manage.py seed_dev
```

---

You now have a fully working local SciTrek development environment.
