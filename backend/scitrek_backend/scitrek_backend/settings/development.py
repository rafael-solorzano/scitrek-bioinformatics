#development.py

from .base import *
import os

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '0.0.0.0', '.ngrok-free.app']
CORS_ALLOW_ALL_ORIGINS = True
GUEST_LOGIN_ENABLED = env_bool('GUEST_LOGIN_ENABLED', True)
PUBLIC_SIGNUP_ENABLED = env_bool('PUBLIC_SIGNUP_ENABLED', True)


# SQLite remains the zero-configuration default. Docker/full-stack development
# can opt into a disposable PostgreSQL database explicitly.
DATABASE_ENGINE = os.getenv('DATABASE_ENGINE', 'sqlite').lower()
if DATABASE_ENGINE == 'postgresql':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': require_env('DATABASE_NAME'),
            'USER': require_env('DATABASE_USER'),
            'PASSWORD': require_env('DATABASE_PASSWORD'),
            'HOST': require_env('DATABASE_HOST'),
            'PORT': os.getenv('DATABASE_PORT', '5432'),
        }
    }
elif DATABASE_ENGINE == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / '.devdata' / 'db.sqlite3',
        }
    }
else:
    raise ImproperlyConfigured(
        'DATABASE_ENGINE must be either sqlite or postgresql in development.'
    )
