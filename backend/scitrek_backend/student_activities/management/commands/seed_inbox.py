# student_activities/management/commands/seed_inbox.py

from django.core.management.base import BaseCommand
from student_activities.tasks import seed_inbox

class Command(BaseCommand):
    help = "Queue the seed_inbox Celery task"

    def handle(self, *args, **options):
        result = seed_inbox.delay()
        self.stdout.write(self.style.SUCCESS(
            f"✅ seed_inbox task queued (id={result.id})"
        ))
