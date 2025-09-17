# student_activities/tasks.py
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from django.db import transaction
from .models import Message

User = get_user_model()

@shared_task
def seed_inbox():
    """
    Seed (or re-seed) the inbox for every active student.
    - Does NOT require DB constraints or settings changes.
    - If duplicates already exist for (sender, recipient, subject), it keeps the oldest,
      updates its body, and deletes the extras so future runs stay clean.
    - Safe to run multiple times.
    """
    # Ensure the Virtual Scientist user exists
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
    # Give it a random password if none (prevents login prompts in some UIs)
    if not vs.has_usable_password():
        vs.set_password(get_random_string(50))
        vs.save()

    templates = [
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

    created_count = 0
    updated_count = 0
    deleted_dupes = 0

    # One transaction keeps things tidy and avoids partial cleanup on errors
    with transaction.atomic():
        # Only the IDs to keep memory light
        students = User.objects.filter(is_student=True, is_active=True).only("id")
        for student in students:
            for subj, body in templates:
                # Find any existing messages for this triplet
                qs = (
                    Message.objects
                    .filter(sender=vs, recipient=student, subject=subj)
                    .order_by("id")  # oldest first, we will keep the first
                )

                if qs.exists():
                    keep = qs.first()
                    # Update body if it changed
                    if keep.body != body:
                        keep.body = body
                        keep.save(update_fields=["body"])
                        updated_count += 1
                    # Delete any extras that cause MultipleObjectsReturned
                    to_delete = qs.exclude(pk=keep.pk)
                    if to_delete.exists():
                        deleted_dupes += to_delete.delete()[0]
                else:
                    # No message yet—create one
                    Message.objects.create(
                        sender=vs,
                        recipient=student,
                        subject=subj,
                        body=body,
                    )
                    created_count += 1

    return (
        f"Seeded {created_count} new, updated {updated_count}, "
        f"removed {deleted_dupes} duplicates."
    )
