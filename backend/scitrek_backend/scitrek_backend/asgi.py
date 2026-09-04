"""
ASGI config for scitrek_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "scitrek_backend.settings.production")

# Resolve AWS Secrets Manager secrets before settings import (no-op unless
# AWS_SECRETS_MANAGER_SECRET_ID is set). Imported after DJANGO_SETTINGS_MODULE is
# set: importing the package runs scitrek_backend/__init__.py.
from scitrek_backend import aws_secrets

aws_secrets.load_into_environ()

application = get_asgi_application()
