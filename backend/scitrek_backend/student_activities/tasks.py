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
    (
        "Welcome to SciTrek!",
        "Hello Scientist,\n\n"
        "Welcome aboard SciTrek! Over the next 5 days, you’ll dive into the world of gene regulation, cancer biology, "
        "and data-driven diagnostics. Check your Day 1 module to get started—and don’t hesitate to reach out if you "
        "have any questions. Let’s make science fun!\n\n"
        "– Your Virtual Mentor"
    ),
    (
        "Tip for Day 1: Master Gene Regulation",
        "Hi Scientist,\n\n"
        "Great work on Day 1! Here’s a quick tip to solidify your understanding of gene regulation:\n"
        "• Try drawing your own analogy for how promoters and repressors work—maybe in terms of a light switch or "
        "a lock-and-key system. It’ll help cement the concept in your brain.\n\n"
        "Keep up the momentum!\n\n"
        "– Virtual Scientist"
    ),
    (
        "Tip for Day 2: Exploring Cancer Biology",
        "Hello again, Scientist!\n\n"
        "On Day 2, you’ll learn what happens when cells lose their “instructions” and start to grow uncontrollably. "
        "Tip: Pay special attention to the role of p53—it’s known as the “guardian of the genome.” Try sketching the "
        "cell-cycle checkpoints on paper to visualize where p53 acts.\n\n"
        "You’ve got this!\n\n"
        "– Virtual Scientist"
    ),
    (
        "Tip for Day 3: Gene Expression Clues",
        "Hey Scientist,\n\n"
        "Day 3 is all about reading the “volume dial” of genes. Tip: When you compare healthy vs. cancerous expression "
        "charts, look for genes that are consistently high or low across multiple samples—that’s often your best marker. "
        "Jot down 2–3 you’d investigate further.\n\n"
        "Onward to discovery!\n\n"
        "– Virtual Scientist"
    ),
    (
        "Tip for Day 4: Visualize Your Data",
        "Hi Scientist,\n\n"
        "Today you’ll turn numbers into visuals. Tip: Use color-coded bar graphs or heatmaps to highlight up- vs. down-"
        "regulated genes. A simple color key (red = high, blue = low) can immediately show patterns.\n\n"
        "Make those data pop!\n\n"
        "– Virtual Scientist"
    ),
    (
        "Tip for Day 5: Tell Your Gene’s Story",
        "Hello Scientist,\n\n"
        "It’s poster day! Tip: Start with a one-sentence “hook” about why your gene matters in cancer, then build your "
        "background and results around that. A clear narrative will make your poster unforgettable.\n\n"
        "Good luck!\n\n"
        "– Virtual Scientist"
    ),
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
