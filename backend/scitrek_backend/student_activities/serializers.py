# student_activities/serializers.py

from rest_framework import serializers
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from classroom_admin.models import Classroom, Student as StudentProfile
from .models import Module, StudentResponse, QuizAttempt, Message, QuizQuestion

User = get_user_model()


class CustomStudentSignupSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'first_name', 'last_name', 'classroom_name']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_classroom_name(self, value):
        # Ensure the classroom exists by its name
        return get_object_or_404(Classroom, name=value)

    def create(self, validated_data):
        classroom = validated_data.pop('classroom_name')
        password  = validated_data.pop('password')
        user      = User(
            username=validated_data['username'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_student=True
        )
        user.set_password(password)
        user.save()

        # Create the associated Student profile
        StudentProfile.objects.create(
            user=user,
            classroom=classroom,
            first_name=user.first_name,
            last_name=user.last_name
        )
        return user


class StudentProfileSerializer(serializers.ModelSerializer):
    username       = serializers.CharField(source='user.username',   read_only=True)
    first_name     = serializers.CharField(source='user.first_name', read_only=True)
    last_name      = serializers.CharField(source='user.last_name',  read_only=True)
    classroom_id   = serializers.IntegerField(source='classroom.id',   read_only=True)
    classroom_name = serializers.CharField(source='classroom.name',    read_only=True)

    class Meta:
        model  = StudentProfile
        fields = ['username', 'first_name', 'last_name', 'classroom_id', 'classroom_name']


class StudentProfileUpdateSerializer(serializers.ModelSerializer):
    # Only allow updating the classroom by its ID
    classroom = serializers.PrimaryKeyRelatedField(queryset=Classroom.objects.all())

    class Meta:
        model  = StudentProfile
        fields = ['classroom']


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Module
        fields = ['id', 'day', 'title', 'content']


class StudentResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentResponse
        fields = ['module', 'answers', 'file_upload', 'completed_at']

    def validate_file_upload(self, file):
        if not file:
            return file
        max_size = 5 * 1024 * 1024
        if file.size > max_size:
            raise serializers.ValidationError("File too large (max 5 MB).")
        allowed = ['application/pdf', 'text/csv', 'image/png', 'image/jpeg']
        content_type = getattr(file, 'content_type', None)
        if content_type and content_type not in allowed:
            raise serializers.ValidationError("Unsupported file type.")
        return file


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_type = serializers.ChoiceField(choices=QuizAttempt.TYPE_CHOICES)

    class Meta:
        model  = QuizAttempt
        fields = ['quiz_type', 'score', 'attempt_data', 'timestamp']

    def validate_quiz_type(self, value):
        if value not in dict(QuizAttempt.TYPE_CHOICES):
            raise serializers.ValidationError("Invalid quiz_type.")
        return value


class ReadOnlyMessageSerializer(serializers.ModelSerializer):
    id         = serializers.IntegerField(read_only=True)
    is_read    = serializers.BooleanField(read_only=True)
    attachment = serializers.FileField(read_only=True)

    class Meta:
        model  = Message
        fields = ['id', 'subject', 'body', 'timestamp', 'is_read', 'attachment']


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = QuizQuestion
        fields = ['id', 'quiz_type', 'question_text', 'choices']
