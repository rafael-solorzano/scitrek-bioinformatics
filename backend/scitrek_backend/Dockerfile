# 1. Base image
FROM python:3.12-slim AS base

# 2. System deps & create app dir
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      libpq-dev \
      netcat-openbsd \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 3. Install Python deps (including psycopg2‑binary)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy your code
COPY . .

# 5. Collect static files
RUN python manage.py collectstatic --noinput

# 6. Entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 7. Default command
CMD ["/entrypoint.sh"]
