#classroom_admin/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    CustomUser,
    Classroom,
    Student,
    ModuleAssignment,
    QuizAssignment,
    ScheduledMessage,
)

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('SciTrek roles', {'fields': ('is_teacher', 'is_student')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('SciTrek roles', {'fields': ('is_teacher', 'is_student')}),
    )
    list_display  = ('username', 'email', 'is_staff', 'is_teacher', 'is_student')
    search_fields = ('username', 'email')

@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display  = ('name', 'teacher', 'created_at')
    search_fields = ('name',)
    list_filter   = ('teacher',)

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ('user', 'first_name', 'last_name', 'classroom')
    search_fields = ('user__username', 'first_name', 'last_name')
    list_filter   = ('classroom',)

@admin.register(ModuleAssignment)
class ModuleAssignmentAdmin(admin.ModelAdmin):
    list_display  = ('classroom', 'module', 'release_date', 'created_at')
    list_filter   = ('classroom', 'module')
    search_fields = ('module__title',)

@admin.register(QuizAssignment)
class QuizAssignmentAdmin(admin.ModelAdmin):
    list_display  = ('classroom', 'quiz_type', 'release_date', 'created_at')
    list_filter   = ('classroom', 'quiz_type')

@admin.register(ScheduledMessage)
class ScheduledMessageAdmin(admin.ModelAdmin):
    list_display  = ('classroom', 'subject', 'scheduled_time', 'sent', 'sent_at')
    list_filter   = ('classroom', 'sent')
    search_fields = ('subject',)
