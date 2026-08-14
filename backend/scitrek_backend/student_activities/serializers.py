# student_activities/serializers.py

from pathlib import Path

from rest_framework import serializers
from rest_framework.reverse import reverse
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

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
        try:
            return Classroom.objects.get(name=value)
        except Classroom.DoesNotExist:
            raise serializers.ValidationError("Classroom does not exist.")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        candidate = User(
            username=attrs.get('username', ''),
            first_name=attrs.get('first_name', ''),
            last_name=attrs.get('last_name', ''),
        )
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)}) from exc
        return attrs

    @transaction.atomic
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
        allowed = {
            '.pdf': ('application/pdf', b'%PDF-'),
            '.csv': ('text/csv', None),
            '.png': ('image/png', b'\x89PNG\r\n\x1a\n'),
            '.jpg': ('image/jpeg', b'\xff\xd8\xff'),
            '.jpeg': ('image/jpeg', b'\xff\xd8\xff'),
        }
        suffix = Path(file.name or '').suffix.lower()
        if suffix not in allowed:
            raise serializers.ValidationError("Unsupported file extension.")

        expected_type, magic = allowed[suffix]
        content_type = getattr(file, 'content_type', None)
        if content_type and content_type != expected_type:
            raise serializers.ValidationError("Unsupported file type.")
        if magic is not None:
            position = file.tell() if hasattr(file, 'tell') else None
            header = file.read(len(magic))
            if position is not None and hasattr(file, 'seek'):
                file.seek(position)
            if header != magic:
                raise serializers.ValidationError("File content does not match its declared type.")
        return file

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['file_upload'] = (
            reverse(
                'api-response-file',
                kwargs={'pk': instance.pk},
                request=self.context.get('request'),
            )
            if instance.file_upload else None
        )
        return data


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_type = serializers.ChoiceField(choices=QuizAttempt.TYPE_CHOICES)
    score = serializers.FloatField(read_only=True)

    class Meta:
        model  = QuizAttempt
        fields = ['quiz_type', 'score', 'attempt_data', 'timestamp']

    def validate_quiz_type(self, value):
        if value not in dict(QuizAttempt.TYPE_CHOICES):
            raise serializers.ValidationError("Invalid quiz_type.")
        return value

    def validate_attempt_data(self, value):
        if not isinstance(value, dict) or not isinstance(value.get('answers'), dict):
            raise serializers.ValidationError(
                'attempt_data must contain an answers object keyed by question ID.'
            )
        return value


class ReadOnlyMessageSerializer(serializers.ModelSerializer):
    id         = serializers.IntegerField(read_only=True)
    is_read    = serializers.BooleanField(read_only=True)
    attachment = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = ['id', 'subject', 'body', 'timestamp', 'is_read', 'attachment']

    def get_attachment(self, obj):
        if not obj.attachment:
            return None
        return reverse(
            'api-inbox-attachment',
            kwargs={'pk': obj.pk},
            request=self.context.get('request'),
        )


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = QuizQuestion
        fields = ['id', 'quiz_type', 'question_text', 'choices']
