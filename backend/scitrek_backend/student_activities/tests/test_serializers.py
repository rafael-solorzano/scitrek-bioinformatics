from django.test import TestCase
from unittest.mock import patch
from student_activities.serializers import (
    CustomStudentSignupSerializer,
    QuizAttemptSerializer,
    StudentResponseSerializer,
)
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import serializers
from classroom_admin.models import Classroom, CustomUser, Student
from student_activities.models import QuizAttempt

class StudentResponseSerializerTests(TestCase):
    def test_validate_file_upload_too_large(self):
        # Create a dummy file >5MB
        large_content = b"0" * (5 * 1024 * 1024 + 1)
        file = SimpleUploadedFile("large.pdf", large_content, content_type="application/pdf")
        serializer = StudentResponseSerializer(data={
            'module': 1,
            'answers': {},
            'file_upload': file
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('file_upload', serializer.errors)

    def test_validate_file_upload_accepts_allowed_types(self):
        for name, content_type, content in [
            ("answer.pdf", "application/pdf", b"%PDF-1.4"),
            ("answer.csv", "text/csv", b"heading,value\n"),
            ("answer.png", "image/png", b"\x89PNG\r\n\x1a\n"),
            ("answer.jpg", "image/jpeg", b"\xff\xd8\xff"),
        ]:
            with self.subTest(content_type=content_type):
                file = SimpleUploadedFile(name, content, content_type=content_type)
                serializer = StudentResponseSerializer()
                self.assertEqual(serializer.validate_file_upload(file), file)

    def test_validate_file_upload_rejects_mismatched_magic_bytes(self):
        file = SimpleUploadedFile("answer.png", b"<html>script</html>", content_type="image/png")

        with self.assertRaisesMessage(serializers.ValidationError, "does not match"):
            StudentResponseSerializer().validate_file_upload(file)

    def test_validate_file_upload_allows_missing_file(self):
        serializer = StudentResponseSerializer()

        self.assertIsNone(serializer.validate_file_upload(None))


class SignupSerializerTests(TestCase):
    def setUp(self):
        self.teacher = CustomUser.objects.create_user(username="teacher", password="pw", is_teacher=True)
        self.classroom = Classroom.objects.create(name="1001", teacher=self.teacher)

    def test_signup_serializer_creates_student_user_and_profile(self):
        serializer = CustomStudentSignupSerializer(data={
            "username": "alice",
            "password": "S3cure-Science!2026",
            "first_name": "Alice",
            "last_name": "Learner",
            "classroom_name": "1001",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertTrue(user.is_student)
        self.assertTrue(user.check_password("S3cure-Science!2026"))
        profile = Student.objects.get(user=user)
        self.assertEqual(profile.classroom, self.classroom)

    def test_signup_serializer_rejects_unknown_classroom(self):
        serializer = CustomStudentSignupSerializer(data={
            "username": "alice",
            "password": "S3cure-Science!2026",
            "first_name": "Alice",
            "last_name": "Learner",
            "classroom_name": "missing",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("classroom_name", serializer.errors)

    def test_signup_serializer_rejects_duplicate_username(self):
        CustomUser.objects.create_user(username="alice", password="pw")
        serializer = CustomStudentSignupSerializer(data={
            "username": "alice",
            "password": "S3cure-Science!2026",
            "first_name": "Alice",
            "last_name": "Learner",
            "classroom_name": "1001",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("username", serializer.errors)

    def test_signup_serializer_rejects_weak_password(self):
        serializer = CustomStudentSignupSerializer(data={
            "username": "alice",
            "password": "pw",
            "first_name": "Alice",
            "last_name": "Learner",
            "classroom_name": "1001",
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)

    def test_signup_rolls_back_user_when_profile_creation_fails(self):
        serializer = CustomStudentSignupSerializer(data={
            "username": "rollback-student",
            "password": "S3cure-Science!2026",
            "first_name": "Roll",
            "last_name": "Back",
            "classroom_name": "1001",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)

        with patch(
            'student_activities.serializers.StudentProfile.objects.create',
            side_effect=RuntimeError('profile failure'),
        ), self.assertRaises(RuntimeError):
            serializer.save()

        self.assertFalse(CustomUser.objects.filter(username='rollback-student').exists())
        self.assertFalse(Student.objects.filter(user__username='rollback-student').exists())


class QuizAttemptSerializerTests(TestCase):
    def test_accepts_valid_quiz_types_and_answer_map(self):
        for quiz_type in [QuizAttempt.PRE, QuizAttempt.POST]:
            with self.subTest(quiz_type=quiz_type):
                serializer = QuizAttemptSerializer(data={
                    "quiz_type": quiz_type,
                    "attempt_data": {"answers": {"1": "A"}},
                })
                self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rejects_invalid_quiz_type(self):
        serializer = QuizAttemptSerializer(data={
            "quiz_type": "mid",
            "attempt_data": {"answers": {}},
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("quiz_type", serializer.errors)

    def test_score_is_read_only(self):
        serializer = QuizAttemptSerializer(data={
            "quiz_type": QuizAttempt.PRE,
            "score": 100,
            "attempt_data": {"answers": {"1": "B"}},
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("score", serializer.validated_data)

    def test_attempt_data_requires_answers_object(self):
        serializer = QuizAttemptSerializer(data={
            "quiz_type": QuizAttempt.POST,
            "attempt_data": {"try": 1},
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("attempt_data", serializer.errors)
    def test_validate_file_upload_bad_type(self):
        small_content = b"hello"
        file = SimpleUploadedFile("script.exe", small_content, content_type="application/octet-stream")
        serializer = StudentResponseSerializer(data={
            'module': 1,
            'answers': {},
            'file_upload': file
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('file_upload', serializer.errors)
