# student_activities/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

from classroom_admin.models import Student as StudentProfile
from student_activities.tasks import seed_inbox_for_user_now

@receiver(post_save, sender=StudentProfile)
def seed_inbox_when_student_created(sender, instance, created, **kwargs):
    """
    After the Student profile is created, seed the user's inbox.
    Safe to run because the task is idempotent.
    """
    user = getattr(instance, "user", None)
    if created and user and getattr(user, "is_active", False) and getattr(user, "is_student", False):
        seed_inbox_for_user_now(user.id)
