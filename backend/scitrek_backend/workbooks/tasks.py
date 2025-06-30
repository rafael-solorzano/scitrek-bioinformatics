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

        # 2) Locate all of our eight main headings and the spans between them
        headings = [
            "Welcome to SciTrek!",
            "What You’ll Learn in the Bioinformatics Module",
            "Important Vocabulary",
            "Day 1",
            "Day 2",
            "Day 3",
            "Day 4",
            "Day 5"
        ]
        # build a big regex that matches any heading exactly
        pattern = r"(?m)^(" + "|".join(re.escape(h) for h in headings) + r")\s*$"
        matches = list(re.finditer(pattern, full_text))

        sections = []
        for idx, m in enumerate(matches):
            start = m.end()
            end = matches[idx+1].start() if idx+1 < len(matches) else len(full_text)
            heading = m.group(1)
            body = full_text[start:end].strip()
            # escape HTML and convert newlines to paragraphs
            html = linebreaks(escape(body))
            sections.append((heading, html))

        # 3) Delete existing and re-create
        wb.sections.all().delete()
        for order, (heading, content_html) in enumerate(sections, start=1):
            Section.objects.create(
                workbook=wb,
                order=order,
                heading=heading,
                content_html=content_html,
            )

        wb.import_finished = timezone.now()
        wb.save()

    except Exception as e:
        wb.import_finished = timezone.now()
        wb.import_error = str(e)
        wb.save()
        raise
