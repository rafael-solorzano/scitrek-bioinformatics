# workbooks/models.py
from django.db import models
from django.conf import settings

class Workbook(models.Model):
    """
    Represents an uploaded workbook (PDF) and tracks its ingestion status.
    """
    ROLE_CHOICES = [
        ('student', 'Student Workbook'),
        ('teacher', 'Teacher Workbook'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    # uploaded PDF file
    file = models.FileField(upload_to='workbooks/', null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    # timestamps for PDF ingestion process
    import_started = models.DateTimeField(null=True, blank=True)
    import_finished = models.DateTimeField(null=True, blank=True)
    # record any errors encountered during parsing
    import_error = models.TextField(blank=True)

    def __str__(self):
        return f"{self.get_role_display()} - {self.title}"


class Section(models.Model):
    """
    A section extracted from a workbook, containing HTML content.
    """
    workbook = models.ForeignKey(
        Workbook,
        on_delete=models.CASCADE,
        related_name='sections'
    )
    heading = models.CharField(max_length=200)
    order = models.PositiveIntegerField()  # e.g. Day 1, Day 2, etc
    content_html = models.TextField()  # HTML extracted from PDF

    class Meta:
        unique_together = ('workbook', 'order')
        ordering = ['order']

    def __str__(self):
        return f"{self.workbook} - Section {self.order}: {self.heading}"


class SectionImage(models.Model):
    """
    Images associated with a section of a workbook.
    """
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='workbook_images/')
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Image {self.order} for {self.section}"
