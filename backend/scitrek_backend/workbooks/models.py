# workbooks/models.py

from django.db import models
from django.conf import settings

class Workbook(models.Model):
    """
    Represents an uploaded workbook template.
    """
    ROLE_CHOICES = [
        ('student', 'Student Workbook'),
        ('teacher', 'Teacher Workbook'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(
        upload_to='workbooks/pdfs/',
        null=True,   # allow existing rows to have no file
        blank=True   # allow empty uploads from forms
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    import_started = models.DateTimeField(null=True, blank=True)
    import_finished = models.DateTimeField(null=True, blank=True)
    import_error = models.TextField(blank=True)

    def __str__(self):
        return f"{self.get_role_display()} – {self.title}"


class Section(models.Model):
    """
    A section (e.g. a “day” or chapter) in the workbook.
    """
    workbook = models.ForeignKey(Workbook, on_delete=models.CASCADE, related_name='sections')
    heading = models.CharField(max_length=200)
    order = models.PositiveIntegerField()
    content_html = models.TextField()

    class Meta:
        unique_together = ('workbook', 'order')
        ordering = ['order']

    def __str__(self):
        return f"{self.workbook.title} – Section {self.order}: {self.heading}"


class SectionImage(models.Model):
    """
    Any images tied to a Section.
    """
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='workbook_images/')
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Image {self.order} for {self.section}"


class Question(models.Model):
    """
    A question within a workbook section.
    """
    workbook = models.ForeignKey(
        Workbook,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    order = models.PositiveIntegerField()
    prompt = models.TextField(help_text="HTML/text of the question prompt")

    TEXT = 'text'
    TEXTAREA = 'textarea'
    NUMBER = 'number'
    INPUT_TYPE_CHOICES = [
        (TEXT, 'Single-line text'),
        (TEXTAREA, 'Multi-line text'),
        (NUMBER, 'Number'),
    ]
    input_type = models.CharField(
        max_length=10,
        choices=INPUT_TYPE_CHOICES,
        default=TEXT
    )

    class Meta:
        unique_together = ('workbook', 'order')
        ordering = ['order']

    def __str__(self):
        return f"{self.workbook.title} – Question {self.order}"


class StudentAnswer(models.Model):
    """
    A student’s answer to a question.
    """
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='student_answers'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'is_student': True}
    )
    answer = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('question', 'student')

    def __str__(self):
        return f"{self.student.username} → Q{self.question.order}"
