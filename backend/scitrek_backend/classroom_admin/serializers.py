from rest_framework import serializers
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import (
    Classroom, Student,
    ModuleAssignment, QuizAssignment, ScheduledMessage
)

User = get_user_model()


class ClassroomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = ['id', 'name', 'description']


class RosterStudentSerializer(serializers.ModelSerializer):
    id         = serializers.IntegerField(source='user.id')
    username   = serializers.CharField(source='user.username')
    first_name = serializers.CharField(source='user.first_name')
    last_name  = serializers.CharField(source='user.last_name')

    class Meta:
        model = Student
        fields = ['id', 'username', 'first_name', 'last_name']


class RosterAddSerializer(serializers.Serializer):
    student_username = serializers.CharField()

    def validate_student_username(self, value):
        user = get_object_or_404(User, username=value, is_student=True)
        return user

    def save(self, classroom):
        user = self.validated_data['student_username']
        profile, _ = Student.objects.get_or_create(user=user)
        profile.classroom  = classroom
        profile.first_name = user.first_name
        profile.last_name  = user.last_name
        profile.save()
        return profile


class ModuleAssignmentSerializer(serializers.ModelSerializer):
    module_title = serializers.CharField(source='module.title', read_only=True)

    class Meta:
        model  = ModuleAssignment
        fields = ['id', 'module', 'module_title', 'release_date', 'created_at']

    def validate_release_date(self, value):
        if value and value < timezone.now():
            raise ValidationError("release_date cannot be in the past.")
        return value


class QuizAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = QuizAssignment
        fields = ['id', 'quiz_type', 'release_date', 'created_at']

    def validate_release_date(self, value):
        if value and value < timezone.now():
            raise ValidationError("release_date cannot be in the past.")
        return value


class ScheduledMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ScheduledMessage
        fields = [
            'id', 'subject', 'body', 'attachment',
            'scheduled_time', 'sent', 'sent_at', 'created_at'
        ]

    def validate_scheduled_time(self, value):
        if value < timezone.now():
            raise ValidationError("scheduled_time cannot be in the past.")
        return value


class CustomStudentSignupSerializer(serializers.ModelSerializer):
    # now require the classroom PK instead of name
    classroom = serializers.PrimaryKeyRelatedField(
        queryset=Classroom.objects.all(),
        write_only=True
    )

    class Meta:
        model = User
        fields = ['username', 'password', 'first_name', 'last_name', 'classroom']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        classroom = validated_data.pop('classroom')
        password  = validated_data.pop('password')
        user      = User(**validated_data)
        user.is_student = True
        user.set_password(password)
        user.save()
        Student.objects.create(
            user=user,
            classroom=classroom,
            first_name=user.first_name,
            last_name=user.last_name
        )
        return user
