# scitrek_backend/celery.py
import os
from celery import Celery

# 1. Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scitrek_backend.settings.development')

# Resolve AWS Secrets Manager secrets (no-op unless AWS_SECRETS_MANAGER_SECRET_ID
# is set) before app.config_from_object reads Django settings below.
from scitrek_backend import aws_secrets

aws_secrets.load_into_environ()

app = Celery('scitrek_backend')

# 2. Read config from Django settings, CELERY_* keys
app.config_from_object('django.conf:settings', namespace='CELERY')

# 3. Autodiscover tasks in each installed app's tasks.py
app.autodiscover_tasks()
