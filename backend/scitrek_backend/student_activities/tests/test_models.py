# student_activities/tests/test_models.py
from django.test import TestCase
from student_activities.models import Module, StudentResponse, QuizAttempt
from classroom_admin.models import CustomUser, Classroom

class ModelConstraintTests(TestCase):
    def setUp(self):
        self.teacher = CustomUser.objects.create_user(
            username="teacher1",
            password="pass",
            is_teacher=True,
        )
        self.classroom = Classroom.objects.create(name="Test Class", teacher=self.teacher)
        self.module = Module.objects.create(day=1, title="Day 1", content="C1", classroom=self.classroom)
        self.user = CustomUser.objects.create_user(username="stu1", password="pass", is_student=True)

    def test_unique_student_response(self):
        StudentResponse.objects.create(student=self.user, module=self.module, answers={})
        with self.assertRaises(Exception):
            # duplicate should error
            StudentResponse.objects.create(student=self.user, module=self.module, answers={})

    def test_module_day_is_unique_per_classroom(self):
        other_teacher = CustomUser.objects.create_user(
            username="teacher2",
            password="pass",
            is_teacher=True,
        )
        other_classroom = Classroom.objects.create(name="Other Class", teacher=other_teacher)

        Module.objects.create(day=1, title="Other Day 1", content="C1", classroom=other_classroom)

        with self.assertRaises(Exception):
            Module.objects.create(day=1, title="Duplicate Day 1", content="C1", classroom=self.classroom)

    def test_unique_quiz_attempt(self):
        QuizAttempt.objects.create(
            student=self.user,
            classroom=self.classroom,
            quiz_type=QuizAttempt.PRE,
            score=0.5,
            attempt_data={},
        )
        with self.assertRaises(Exception):
            QuizAttempt.objects.create(
                student=self.user,
                classroom=self.classroom,
                quiz_type=QuizAttempt.PRE,
                score=0.7,
                attempt_data={},
            )
