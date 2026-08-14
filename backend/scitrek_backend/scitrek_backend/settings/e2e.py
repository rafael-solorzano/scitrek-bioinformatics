"""Settings for the disposable backend-connected browser test environment."""

import os

from .base import *


DEBUG = False
SECRET_KEY = require_env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "web", "testserver"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": require_env("DATABASE_NAME"),
        "USER": require_env("DATABASE_USER"),
        "PASSWORD": require_env("DATABASE_PASSWORD"),
        "HOST": require_env("DATABASE_HOST"),
        "PORT": os.getenv("DATABASE_PORT", "5432"),
        "CONN_MAX_AGE": 0,
    }
}

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = ["http://127.0.0.1:3101", "http://localhost:3101"]
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
GUEST_LOGIN_ENABLED = True
GUEST_CLASSROOM_NAME = "1001"
PUBLIC_SIGNUP_ENABLED = True

# TLS terminates outside Django in production. The isolated E2E stack intentionally
# uses loopback HTTP so Playwright can exercise it without certificates.
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", True)
CELERY_TASK_EAGER_PROPAGATES = True

# The seed command additionally verifies the database name contains "e2e".
E2E_RESET_ALLOWED = env_bool("SCITREK_E2E_RESET_ALLOWED", False)
