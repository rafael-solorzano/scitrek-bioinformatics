# student_activities/tests/test_api.py
from django.urls import reverse
from rest_framework.test import APITestCase
from classroom_admin.models import Classroom
from django.contrib.auth import get_user_model
from .models import Message, Module, QuizQuestion

User = get_user_model()

class StudentAPITest(APITestCase):
    def setUp(self):
        # create classroom, user, token
        self.classroom = Classroom.objects.create(name="Test 101")
        self.signup_url = reverse('api-signup')
        self.token_url  = reverse('token_obtain_pair')
        # messages, modules, questions
        self.msg = Message.objects.create(
            sender=User.objects.create_user('vs', password='x'),
            recipient=None,  # will assign after signup
            subject="Hello", body="Welcome!"
        )
        Module.objects.create(day=1, title="Intro", content="...", classroom=self.classroom)
        QuizQuestion.objects.create(
            quiz_type=QuizQuestion.PRE,
            classroom=self.classroom,
            question_text="Q1?",
            choices={"A":"Yes","B":"No"},
            answer="A"
        )

    def test_signup_and_profile(self):
        # missing classroom_name
        resp = self.client.post(self.signup_url, {
            "username":"alice","password":"pw","first_name":"A","last_name":"L"
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        # correct signup
        resp = self.client.post(self.signup_url, {
            "username":"alice","password":"pw","first_name":"A","last_name":"L",
            "classroom_name": self.classroom.name
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        # login
        login = self.client.post(self.token_url, {"username":"alice","password":"pw"}, format='json')
        token = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        # profile
        prof = self.client.get(reverse('api-student-profile'))
        self.assertEqual(prof.data['classroom'], self.classroom.name)

    def test_modules_scope(self):
        # signup & auth omitted for brevity...
        pass

    def test_inbox_read_toggle(self):
        # after auth, POST message to recipient, toggle read
        pass

    def test_quiz_flow(self):
        # fetch pre‑quiz questions → submit attempt → check progress
        pass
