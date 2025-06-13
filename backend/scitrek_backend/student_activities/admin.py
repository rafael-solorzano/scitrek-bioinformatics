# student_activities/admin.py

from django.contrib import admin
from .models import (
    Message,
    Module,
    StudentResponse,
    QuizAttempt,
    QuizQuestion,       # if you want to manage questions via admin
)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ('subject', 'sender', 'recipient', 'timestamp', 'is_read')
    list_filter   = ('is_read',)
    search_fields = ('subject',)

@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display  = ('day', 'title', 'classroom')
    list_filter   = ('classroom',)
    ordering      = ('day',)

@admin.register(StudentResponse)
class StudentResponseAdmin(admin.ModelAdmin):
    list_display  = ('student', 'module', 'completed_at')
    list_filter   = ('module__day',)
    search_fields = ('student__username',)

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display  = ('student', 'quiz_type', 'score', 'timestamp')
    list_filter   = ('quiz_type',)
    search_fields = ('student__username',)

@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display  = ('quiz_type', 'classroom', 'question_text')
    list_filter   = ('quiz_type', 'classroom')
    search_fields = ('question_text',)
