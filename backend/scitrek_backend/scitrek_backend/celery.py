# scitrek_backend/celery.py
import os
from celery import Celery

# 1. Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scitrek_backend.settings')

app = Celery('scitrek_backend')

# 2. Read config from Django settings, CELERY_* keys
app.config_from_object('django.conf:settings', namespace='CELERY')

# 3. Autodiscover tasks in each installed app’s “tass.py”
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
