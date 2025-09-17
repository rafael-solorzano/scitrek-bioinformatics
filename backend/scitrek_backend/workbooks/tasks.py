# workbooks/tasks.py

from celery import shared_task
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
    wb = Workbook.objects.get(id=workbook_id)
    wb.import_started = timezone.now()
    wb.import_error = ''
    wb.save()
    try:
        # 1) Extract the full text of the PDF
        with pdfplumber.open(wb.file.path) as pdf:
            full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        # 2) Locate each full section title (including subtitle) in the revised workbook
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
        # compile a single multiline‐regex that matches any of those headings exactly on its own line
        pattern = r"(?m)^(" + "|".join(headings_patterns) + r")\s*$"
        matches = list(re.finditer(pattern, full_text))

        # 3) Slice text between successive headings, convert to HTML, and collect
        sections = []
        for idx, m in enumerate(matches):
            start = m.end()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(full_text)
            heading = m.group(1)
            body = full_text[start:end].strip()
            # escape HTML and convert newlines to paragraphs
            html = linebreaks(escape(body))
            sections.append((heading, html))

        # 4) Delete any existing sections and recreate them in order
        wb.sections.all().delete()
        for order, (heading, content_html) in enumerate(sections, start=1):
            Section.objects.create(
                workbook=wb,
                order=order,
                heading=heading,
                content_html=content_html,
            )

        # 5) Mark import finished
        wb.import_finished = timezone.now()
        wb.save()

    except Exception as e:
        wb.import_finished = timezone.now()
        wb.import_error = str(e)
        wb.save()
        raise
