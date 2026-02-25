#development.py

from .base import *
import os

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '0.0.0.0', '.ngrok-free.app']


# Database configuration for development using SQLite
# SQLite cannot create parent directories; ensure .devdata exists so the DB file can be created.
_db_dir = BASE_DIR / ".devdata"
_db_dir.mkdir(parents=True, exist_ok=True)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": _db_dir / "db.sqlite3",
    }
}

