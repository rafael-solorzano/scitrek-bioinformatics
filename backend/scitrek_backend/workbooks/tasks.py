# workbooks/tasks.py
from celery import shared_task
from django.utils import timezone
from .models import Workbook, Section, SectionImage
from pdf2image import convert_from_path
from bs4 import BeautifulSoup
import tempfile, os, traceback

@shared_task
def parse_workbook_task(workbook_id):
    """
    Task to parse uploaded PDF into sections and images.
    """
    wb = Workbook.objects.get(id=workbook_id)
    # mark import started
    wb.import_started = timezone.now()
    wb.import_error = ''
    wb.save()

    try:
        # Convert PDF pages to images
        pages = convert_from_path(wb.file.path)
        
        for idx, page in enumerate(pages, start=1):
            # Save page image to MEDIA
            temp_dir = tempfile.mkdtemp()
            img_path = os.path.join(temp_dir, f"page_{idx}.png")
            page.save(img_path, 'PNG')

            # Construct section placeholder
            heading = f"Section {idx}"
            content_html = f"<img src='{os.path.relpath(img_path, os.getcwd())}' />"

            section = Section.objects.create(
                workbook=wb,
                heading=heading,
                order=idx,
                content_html=content_html
            )
            # Create SectionImage record and point to saved file
            img_field = SectionImage(
                section=section,
                caption='',
                order=0
            )
            with open(img_path, 'rb') as f:
                img_field.image.save(os.path.basename(img_path), f, save=True)

        # mark import finished
        wb.import_finished = timezone.now()
        wb.save()
    except Exception as e:
        # capture error details
        wb.import_finished = timezone.now()
        wb.import_error = traceback.format_exc()
        wb.save()
        # re-raise or swallow based on needs
        raise
