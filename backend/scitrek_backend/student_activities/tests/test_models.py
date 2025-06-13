# student_activities/tests/test_models.py
from django.test import TestCase
from student_activities.models import Module, StudentResponse, QuizAttempt
from classroom_admin.models import CustomUser, Classroom

class ModelConstraintTests(TestCase):
    def setUp(self):
        self.classroom = Classroom.objects.create(name="Test Class")
        self.module = Module.objects.create(day=1, title="Day 1", content="C1", classroom=self.classroom)
        self.user = CustomUser.objects.create_user(username="stu1", password="pass", is_student=True)

    def test_unique_student_response(self):
        StudentResponse.objects.create(student=self.user, module=self.module, answers={})
        with self.assertRaises(Exception):
            # duplicate should error
            StudentResponse.objects.create(student=self.user, module=self.module, answers={})

    def test_unique_quiz_attempt(self):
        QuizAttempt.objects.create(student=self.user, quiz_type=QuizAttempt.PRE, score=0.5, attempt_data={})
        with self.assertRaises(Exception):
            QuizAttempt.objects.create(student=self.user, quiz_type=QuizAttempt.PRE, score=0.7, attempt_data={})