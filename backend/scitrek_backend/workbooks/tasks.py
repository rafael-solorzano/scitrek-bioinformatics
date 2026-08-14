# workbooks/tasks.py

from celery import shared_task
from django.db import transaction
from django.utils import timezone
import re
import pdfplumber
from django.utils.html import escape, linebreaks
from .models import Workbook, Section

@shared_task
def parse_workbook_task(workbook_id):
    """
    Task to parse an uploaded workbook PDF into logical sections based on predefined headings.
    """
    started_at = timezone.now()
    try:
        # Serialize imports for a workbook and make replacement all-or-nothing.
        # Holding the row lock also prevents an API file update from racing an
        # older parser invocation into the final content.
        with transaction.atomic():
            wb = Workbook.objects.select_for_update().get(id=workbook_id)
            wb.import_started = started_at
            wb.import_finished = None
            wb.import_error = ''
            wb.save(update_fields=['import_started', 'import_finished', 'import_error'])

            # 1) Extract the full text of the PDF.
            with pdfplumber.open(wb.file.path) as pdf:
                full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

            # 2) Locate each full section title on its own line.
            headings_patterns = [
                r"Welcome to SciTrek!",
                r"What You’ll Learn in the Glucose Sensing Module",
                r"Important Vocabulary",
                r"Day 1:Unlocking the Code: How Your Cells Decide What to Do",
                r"Day 2: Understanding Cancer",
                r"Day 3: Seeing Static: Gene Signals & Cancer Detection",
                r"Day 4: Levels of Expression, Diagnosis, & Treatment",
                r"Day 5: Poster Perfect: Showcasing Your Scientific Journey!"
            ]
            pattern = r"(?m)^(" + "|".join(headings_patterns) + r")\s*$"
            matches = list(re.finditer(pattern, full_text))
            if not matches:
                raise ValueError("No recognized workbook section headings found in PDF.")

            # 3) Build the complete replacement before touching current rows.
            sections = []
            for idx, match in enumerate(matches):
                start = match.end()
                end = matches[idx + 1].start() if idx + 1 < len(matches) else len(full_text)
                body = full_text[start:end].strip()
                sections.append(Section(
                    workbook=wb,
                    order=idx + 1,
                    heading=match.group(1),
                    content_html=linebreaks(escape(body)),
                ))

            # 4) Replace atomically; any failure restores the last-known-good set.
            wb.sections.all().delete()
            Section.objects.bulk_create(sections)
            wb.import_finished = timezone.now()
            wb.save(update_fields=['import_finished'])

    except Exception as exc:
        Workbook.objects.filter(pk=workbook_id).update(
            import_started=started_at,
            import_finished=timezone.now(),
            import_error=str(exc),
        )
        raise
