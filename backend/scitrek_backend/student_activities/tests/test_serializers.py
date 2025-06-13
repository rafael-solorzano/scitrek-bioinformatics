# student_activities/tests/test_serializers.py
from django.test import TestCase
from student_activities.serializers import StudentResponseSerializer
from django.core.files.uploadedfile import SimpleUploadedFile

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

