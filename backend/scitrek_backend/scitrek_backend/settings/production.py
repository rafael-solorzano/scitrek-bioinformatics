#production.py

from .base import *
import os

DEBUG = False

ALLOWED_HOSTS = [
    "13.57.59.22",
    "sci-trek.org",
    "www.sci-trek.org",
    "localhost",
    "0.0.0.0"
]

# Database configuration for PostgreSQL in production
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv('DATABASE_NAME', 'scitrek_db'),
        "USER": os.getenv('DATABASE_USER', 'scitrek_db_admin'),
        "PASSWORD": os.getenv('DATABASE_PASSWORD', 'SciTrek_admin!'),
        "HOST": os.getenv('DATABASE_HOST', 'scitrek-db.clwmksgo6b2g.us-west-1.rds.amazonaws.com'),
        "PORT": os.getenv('DATABASE_PORT', '5432'),
    }
}

# Security settings for production
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

print("✅ Confirmed: Using production settings with SECURE_PROXY_SSL_HEADER")
