#classroom_admin/models.py
from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    is_student = models.BooleanField(default=False)
    is_teacher = models.BooleanField(default=False)

class Classroom(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    teacher     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='classrooms',
        limit_choices_to={'is_teacher': True}
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Student(models.Model):
    user       = models.OneToOneField(
                    settings.AUTH_USER_MODEL,
                    on_delete=models.CASCADE,
                    limit_choices_to={'is_student': True},
                    related_name='student_profile'
                 )
    classroom  = models.ForeignKey(
                    Classroom,
                    on_delete=models.SET_NULL,
                    null=True,
                    related_name='students'
                 )
    first_name = models.CharField(max_length=150)
    last_name  = models.CharField(max_length=150)

    def __str__(self):
        return f"{self.user.username} ({self.classroom})"

class ModuleAssignment(models.Model):
    classroom    = models.ForeignKey(
                       Classroom,
                       on_delete=models.CASCADE,
                       related_name='module_assignments'
                   )
    # refer to the Module model by string to avoid circular import
    module       = models.ForeignKey(
                       'student_activities.Module',
                       on_delete=models.CASCADE
                   )
    release_date = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('classroom', 'module')

    def __str__(self):
        return f"{self.classroom} → {self.module}"

class QuizAssignment(models.Model):
    PRE  = 'pre'
    POST = 'post'
    TYPE_CHOICES = [(PRE, 'Pre‑Module Quiz'), (POST, 'Post‑Module Quiz')]

    classroom    = models.ForeignKey(
                       Classroom,
                       on_delete=models.CASCADE,
                       related_name='quiz_assignments'
                   )
    quiz_type    = models.CharField(max_length=4, choices=TYPE_CHOICES)
    release_date = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('classroom', 'quiz_type')

    def __str__(self):
        return f"{self.classroom} – {self.get_quiz_type_display()}"

class ScheduledMessage(models.Model):
    classroom      = models.ForeignKey(
                         Classroom,
                         on_delete=models.CASCADE,
                         related_name='scheduled_messages'
                     )
    subject        = models.CharField(max_length=255)
    body           = models.TextField()
    attachment     = models.FileField(
                         upload_to='teacher_messages/',
                         blank=True, null=True
                     )
    scheduled_time = models.DateTimeField()
    sent           = models.BooleanField(default=False)
    sent_at        = models.DateTimeField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.classroom}: {self.subject} at {self.scheduled_time}"
