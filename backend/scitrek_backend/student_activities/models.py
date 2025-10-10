# student_activities/models.py

from django.db import models
from classroom_admin.models import CustomUser, Classroom

class Message(models.Model):
    sender      = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    recipient   = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='received_messages'
    )
    subject     = models.CharField(max_length=255)
    body        = models.TextField()
    timestamp   = models.DateTimeField(auto_now_add=True)

    # — Inbox enhancements —
    is_read     = models.BooleanField(default=False)
    attachment  = models.FileField(upload_to='inbox_attachments/', blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["sender", "recipient", "subject"],
                name="uniq_sender_recipient_subject",
            ),
        ]
        indexes = [
            models.Index(fields=["recipient", "is_read", "timestamp"]),
        ]

    def __str__(self):
        return self.subject


class Module(models.Model):
    DAY_CHOICES = [(i, f"Day {i}") for i in range(1, 6)]
    day         = models.IntegerField(choices=DAY_CHOICES, unique=True)
    title       = models.CharField(max_length=200)
    content     = models.TextField()
    classroom   = models.ForeignKey(Classroom, on_delete=models.CASCADE)

    def __str__(self):
        return f"Day {self.day}: {self.title}"


class StudentResponse(models.Model):
    student      = models.ForeignKey(
                       CustomUser,
                       on_delete=models.CASCADE,
                       limit_choices_to={'is_student': True}
                   )
    module       = models.ForeignKey(Module, on_delete=models.CASCADE)
    answers      = models.JSONField()
    file_upload  = models.FileField(
                       upload_to='responses/',
                       blank=True, null=True
                   )
    completed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'module')

    def __str__(self):
        return f"{self.student.username} → Day {self.module.day}"


class QuizQuestion(models.Model):
    PRE  = 'pre'
    POST = 'post'
    TYPE_CHOICES = [
        (PRE,  'Pre‑Module Quiz'),
        (POST, 'Post‑Module Quiz'),
    ]

    quiz_type     = models.CharField(max_length=4, choices=TYPE_CHOICES)
    classroom     = models.ForeignKey(Classroom, on_delete=models.CASCADE)
    question_text = models.TextField()
    # e.g. {"A": "Option 1", "B": "Option 2", …}
    choices       = models.JSONField()
    # the correct key, e.g. "A"
    answer        = models.CharField(max_length=5)

    def __str__(self):
        return f"{self.get_quiz_type_display()} — {self.question_text[:50]}"


class QuizAttempt(models.Model):
    PRE  = QuizQuestion.PRE
    POST = QuizQuestion.POST
    TYPE_CHOICES = QuizQuestion.TYPE_CHOICES

    student      = models.ForeignKey(
                       CustomUser,
                       on_delete=models.CASCADE,
                       limit_choices_to={'is_student': True}
                   )
    quiz_type    = models.CharField(max_length=4, choices=TYPE_CHOICES)
    score        = models.FloatField()
    attempt_data = models.JSONField()
    timestamp    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'quiz_type')

    def __str__(self):
        return f"{self.student.username} – {self.get_quiz_type_display()}"
