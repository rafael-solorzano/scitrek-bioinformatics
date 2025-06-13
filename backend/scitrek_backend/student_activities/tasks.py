# student_activities/tasks.py
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from .models import Message

User = get_user_model()

@shared_task
def seed_inbox():
    """
    Re‑run your inbox‑seeding logic asynchronously.
    """
    vs, _ = User.objects.get_or_create(
        username="virtual_scientist",
        defaults={
            "first_name": "Virtual",
            "last_name": "Scientist",
            "is_teacher": False,
            "is_student": False,
            "is_active": True,
        }
    )
    if not vs.has_usable_password():
        vs.set_password(get_random_string(50))
        vs.save()

    templates = [
        ("Welcome to SciTrek!",      "Hello! I'm your virtual mentor. Let's get started with Day 1’s module."),
        ("Reminder: Pre‑Module Quiz","Don't forget to take the pre‑module quiz before starting Day 1."),
        ("Data Files for Day 2",     "Please download the dataset for Day 2 from the Resources section."),
        ("Tip for Day 3",            "Here's a brand-new tip for Day 3: always back up your FASTA files."),
    ]

    count = 0
    for student in User.objects.filter(is_student=True, is_active=True):
        for subj, body in templates:
            obj, created = Message.objects.get_or_create(
                sender=vs,
                recipient=student,
                subject=subj,
                defaults={"body": body}
            )
            if created:
                count += 1

    return f"Seeded {count} messages"
