#production.py

from .base import *
import os

DEBUG = False

SECRET_KEY = require_secret_env('DJANGO_SECRET_KEY')

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS')
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured('DJANGO_ALLOWED_HOSTS must contain at least one host')

# Database configuration for PostgreSQL in production
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": require_env('DATABASE_NAME'),
        "USER": require_env('DATABASE_USER'),
        "PASSWORD": require_env('DATABASE_PASSWORD'),
        "HOST": require_env('DATABASE_HOST'),
        "PORT": os.getenv('DATABASE_PORT', '5432'),
        "CONN_MAX_AGE": env_int('DATABASE_CONN_MAX_AGE', 60),
        "CONN_HEALTH_CHECKS": True,
    }
}
database_sslmode = require_env('DATABASE_SSLMODE').lower()
if database_sslmode not in {'require', 'verify-ca', 'verify-full'}:
    raise ImproperlyConfigured(
        'DATABASE_SSLMODE must be require, verify-ca, or verify-full in production'
    )
DATABASES['default']['OPTIONS'] = {'sslmode': database_sslmode}

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS')
CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS')

CELERY_BROKER_URL = require_env('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = require_env('CELERY_RESULT_BACKEND')
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': require_env('REDIS_CACHE_URL'),
    }
}
REST_FRAMEWORK['NUM_PROXIES'] = env_int('TRUSTED_PROXY_COUNT', 1)

# Security settings for production
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'
