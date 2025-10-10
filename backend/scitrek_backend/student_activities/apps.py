# student_activities/apps.py
from django.apps import AppConfig

class StudentActivitiesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "student_activities"

    def ready(self):
        # Register signal handlers
        from . import signals  # noqa: F401
