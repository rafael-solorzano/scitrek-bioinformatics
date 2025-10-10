# student_activities/tasks.py
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from django.db import transaction, IntegrityError
from .models import Message

User = get_user_model()

# Centralized templates so both tasks use the same source of truth
TEMPLATES = [
    ("Welcome to SciTrek!",
     "Hello Scientist,\n\nWelcome aboard SciTrek! Over the next 5 days, you’ll dive into gene regulation, cancer biology, and data-driven diagnostics.\nStart with Day 1 and don’t hesitate to reach out if you have questions. Let’s make science fun!\n\n– Your Virtual Mentor"),
    ("Tip for Day 1: Master Gene Regulation (and fix common hiccups)",
     "Hi Scientist,\n\nToday you’ll explore how genes turn ON/OFF and practice with a video quiz + drag-and-drop order + PhET simulation.\n\nQuick wins & fixes:\n• Fill-in-the-blank:\n  – “Express a gene” → often protein; transcription makes mRNA; translation makes protein.\n  – RNA polymerase binds at a promoter; repressors block at the operator; regulatory proteins = transcription factors.\n• Drag-and-drop order:\n  – Typical flow: RNA polymerase binds promoter → Transcription → mRNA → Translation → Protein.\n  – If items won’t drop: use the “Your Order” slots; if cards duplicate, drag slowly and wait for the highlight.\n• Saving answers: click Save at the end of each section and confirm the success message.\n• PhET: list tools needed when the gene was ON; for OFF, which components would you remove.\n\nKeep up the momentum!\n\n– Virtual Scientist"),
    ("Tip for Day 2: Cell Cycle & p53—spot the checkpoints",
     "Hello again, Scientist!\n\nQuick wins & fixes:\n• Two phases: Interphase (G1, S, G2) and Mitosis (PMAT) + Cytokinesis; G0 = resting.\n• p53: primary role = transcription factor; Mdm2 promotes p53 degradation.\n• “Cells divide, differentiate, or die (apoptosis)”; regulator failure → too few (neurodegeneration) or too many (tumor) cells.\n• G1/S scenario: DNA damage + mutant p53 + high cyclin D → checkpoint may be bypassed.\n• Write claims with one concrete mechanism to back them.\n\nYou’ve got this!\n\n– Virtual Scientist"),
    ("Tip for Day 3: Read the “volume dial” (housekeeping vs. suspects)",
     "Hey Scientist,\n\nQuick wins & fixes:\n• Housekeeping (HK1, GAPDH) steady → baseline.\n• Suspicious: oncogene high (e.g., MYC↑), tumor suppressor low (e.g., TP53↓).\n• In the table, justify with a short why and look for patterns across samples.\n• Lightbox: click background or ✕ to close.\n• Hypothesis + experiment: specify control, method (qPCR/RNA-seq), and threshold.\n\nOnward to discovery!\n\n– Virtual Scientist"),
    ("Tip for Day 4: Visualize patterns & use Protein Atlas like a pro",
     "Hi Scientist,\n\nQuick wins & fixes:\n• If Protein Atlas embed is blank, click “Open on Protein Atlas.” Use dropdown for TP53/MYC/EGFR.\n• Keep function entries short and link to Atlas.\n• Example logic: EGFR↑ + TP53↓ supports growth advantage—state method + expected result.\n• Save sections after the table.\n\nMake those data pop!\n\n– Virtual Scientist"),
    ("Tip for Day 5: Tell your gene’s story—clean, clear, and cited",
     "Hello Scientist,\n\nQuick wins & fixes:\n• Title + one-liner: clear claim about over/under-expression.\n• Procedure: 3–5 credible sources; concise method.\n• Visual: label healthy vs. cancer; caption states direction & magnitude.\n• Results/Conclusion: tie function to cancer change; note 1 limitation + improvement.\n• Present: large fonts, consistent colors, QR link; counter “sample bias” with replicates, HK normalization, and a second method.\n\nGood luck!\n\n– Virtual Scientist"),
]

def _get_or_create_vs_user():
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
        vs.save(update_fields=["password"])
    return vs

def _apply_templates_to_recipient(vs, recipient):
    created_count = 0
    updated_count = 0
    deleted_dupes = 0

    for subj, body in TEMPLATES:
        qs = Message.objects.filter(sender=vs, recipient=recipient, subject=subj).order_by("id")
        if qs.exists():
            keep = qs.first()
            if keep.body != body:
                keep.body = body
                keep.save(update_fields=["body"])
                updated_count += 1
            to_delete = qs.exclude(pk=keep.pk)
            if to_delete.exists():
                deleted_dupes += to_delete.delete()[0]
        else:
            Message.objects.create(sender=vs, recipient=recipient, subject=subj, body=body)
            created_count += 1

    return created_count, updated_count, deleted_dupes

@shared_task(bind=True, max_retries=3, default_retry_delay=15)
def seed_inbox_for_user(self, user_id: int):
    """
    Idempotently seed inbox for a single student user.
    Safe to call on every signup/login.
    """
    vs = _get_or_create_vs_user()
    recipient = User.objects.get(pk=user_id, is_student=True, is_active=True)
    with transaction.atomic():
        try:
            c, u, d = _apply_templates_to_recipient(vs, recipient)
            return {"created": c, "updated": u, "deleted_dupes": d}
        except IntegrityError:
            # If a DB unique constraint exists and we race, try once more
            self.retry(countdown=2)

@shared_task
def seed_inbox():
    """
    Bulk (re)seed for ALL active students. Still idempotent.
    Kept for backfills and ops buttons.
    """
    vs = _get_or_create_vs_user()

    created_total = 0
    updated_total = 0
    deleted_total = 0

    with transaction.atomic():
        students = User.objects.filter(is_student=True, is_active=True).only("id")
        for student in students:
            c, u, d = _apply_templates_to_recipient(vs, student)
            created_total += c
            updated_total += u
            deleted_total += d

    return (
        f"Seeded {created_total} new, updated {updated_total}, "
        f"removed {deleted_total} duplicates."
    )
