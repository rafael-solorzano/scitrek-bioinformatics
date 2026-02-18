# SciTrek – Local Development Setup

## Requirements

- Docker Desktop installed and running  
- Node **20** installed (recommended)  
- npm installed  

---

## 1. Clone the Repository

```bash
git clone <repo-url>
cd scitrek-bioinformatics
```

---

## 2. Start the Backend (Django + SQLite + Redis)

From the project root:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build web redis
```

Backend will be available at:

http://localhost:8000

---

## 3. Run Migrations (First Time Only)

Open a **new terminal** in the project root:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec web python manage.py migrate
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
npm install
npm start
```

Frontend will be available at:

http://localhost:3000

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

Delete SQLite file (if using `.devdata`):

```bash
rm -rf backend/scitrek_backend/.devdata/db.sqlite3
```

Rebuild:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build web redis
```

Then run:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec web python manage.py migrate
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec web python manage.py seed_dev
```

---

You now have a fully working local SciTrek development environment.
