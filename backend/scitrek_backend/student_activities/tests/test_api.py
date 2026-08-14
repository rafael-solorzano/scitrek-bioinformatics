from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from classroom_admin.models import (
    Classroom,
    ModuleAssignment,
    QuizAssignment,
    Student,
)
from django.contrib.auth import get_user_model
from student_activities.models import Message, Module, QuizAttempt, QuizQuestion, StudentResponse

User = get_user_model()

class StudentAPITest(APITestCase):
    def setUp(self):
        # create classroom, user, token
        self.teacher = User.objects.create_user(
            'teacher',
            password='x',
            is_teacher=True,
        )
        self.classroom = Classroom.objects.create(name="Test 101", teacher=self.teacher)
        self.signup_url = reverse('api-signup')
        self.guest_login_url = reverse('api-guest-login')
        self.token_url  = reverse('token_obtain_pair')
        # messages, modules, questions
        self.module = Module.objects.create(day=1, title="Intro", content="...", classroom=self.classroom)
        self.module_assignment = ModuleAssignment.objects.create(
            classroom=self.classroom,
            module=self.module,
            release_date=timezone.now(),
        )
        self.pre_question = QuizQuestion.objects.create(
            quiz_type=QuizQuestion.PRE,
            classroom=self.classroom,
            question_text="Q1?",
            choices={"A":"Yes","B":"No"},
            answer="A"
        )
        self.post_question = QuizQuestion.objects.create(
            quiz_type=QuizQuestion.POST,
            classroom=self.classroom,
            question_text="Q2?",
            choices={"A":"Yes","B":"No"},
            answer="B"
        )
        self.pre_assignment = QuizAssignment.objects.create(
            classroom=self.classroom,
            quiz_type=QuizQuestion.PRE,
            release_date=timezone.now(),
        )
        self.post_assignment = QuizAssignment.objects.create(
            classroom=self.classroom,
            quiz_type=QuizQuestion.POST,
            release_date=timezone.now(),
        )

    def authenticate_student(self, username="student", classroom=None):
        classroom = classroom or self.classroom
        user = User.objects.create_user(
            username=username,
            password="pw",
            first_name="First",
            last_name="Last",
            is_student=True,
        )
        Student.objects.create(user=user, classroom=classroom, first_name="First", last_name="Last")
        self.client.force_authenticate(user)
        return user

    def test_signup_and_profile(self):
        # missing classroom_name
        resp = self.client.post(self.signup_url, {
            "username":"alice","password":"S3cure-Science!2026","first_name":"A","last_name":"L"
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        # correct signup
        resp = self.client.post(self.signup_url, {
            "username":"alice","password":"S3cure-Science!2026","first_name":"A","last_name":"L",
            "classroom_name": self.classroom.name
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertIn('access', resp.data)
        self.assertEqual(Message.objects.filter(recipient__username=resp.data['username']).count(), 6)
        self.assertIn('refresh', resp.data)
        # login
        login = self.client.post(
            self.token_url,
            {"username":"alice","password":"S3cure-Science!2026"},
            format='json',
        )
        token = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        # profile
        prof = self.client.get(reverse('api-student-profile'))
        self.assertEqual(prof.data['classroom_name'], self.classroom.name)

    @override_settings(PUBLIC_SIGNUP_ENABLED=False)
    def test_signup_is_disabled_by_secure_production_default(self):
        response = self.client.post(
            self.signup_url,
            {
                'username': 'blocked-signup',
                'password': 'StrongSignupPassword-42!',
                'first_name': 'Blocked',
                'last_name': 'Student',
                'classroom_name': self.classroom.name,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username='blocked-signup').exists())

    def test_guest_login_creates_student_session(self):
        classroom = Classroom.objects.create(name="1001", teacher=self.teacher)

        resp = self.client.post(self.guest_login_url, {}, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertIn('access', resp.data)
        self.assertEqual(Message.objects.filter(recipient__username=resp.data['username']).count(), 6)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        self.assertTrue(resp.data['is_guest'])
        self.assertEqual(resp.data['classroom_name'], classroom.name)
        self.assertTrue(resp.data['username'].startswith('guest_'))
        self.assertTrue(Student.objects.filter(
            user__username=resp.data['username'],
            classroom=classroom,
        ).exists())
        self.assertEqual(Message.objects.filter(recipient__username=resp.data['username']).count(), 6)

    def test_guest_login_seeds_inbox_immediately(self):
        Classroom.objects.create(name="1001", teacher=self.teacher)

        resp = self.client.post(self.guest_login_url, {}, format='json')

        self.assertEqual(resp.status_code, 201)

    @override_settings(GUEST_LOGIN_ENABLED=False)
    def test_guest_login_is_disabled_unless_explicitly_enabled(self):
        Classroom.objects.create(name="1001", teacher=self.teacher)

        resp = self.client.post(self.guest_login_url, {}, format='json')

        self.assertEqual(resp.status_code, 403)
        self.assertFalse(User.objects.filter(username__startswith='guest_').exists())

    @override_settings(GUEST_LOGIN_ENABLED=True, GUEST_CLASSROOM_NAME='demo-only')
    def test_guest_login_rejects_caller_selected_non_demo_classroom(self):
        Classroom.objects.create(name="demo-only", teacher=self.teacher)

        resp = self.client.post(
            self.guest_login_url,
            {'classroom_name': self.classroom.name},
            format='json',
        )

        self.assertEqual(resp.status_code, 403)
        self.assertFalse(User.objects.filter(username__startswith='guest_').exists())

    def test_student_profile_is_read_only(self):
        other = Classroom.objects.create(name="Other", teacher=self.teacher)
        self.authenticate_student()

        resp = self.client.patch(reverse('api-student-profile'), {"classroom": other.id}, format='json')

        self.assertEqual(resp.status_code, 405)
        self.assertFalse(Student.objects.filter(user__username="student", classroom=other).exists())

    def test_modules_scope(self):
        user = self.authenticate_student()
        other_classroom = Classroom.objects.create(name="Other", teacher=self.teacher)
        Module.objects.create(day=2, title="Other Day 2", content="hidden", classroom=other_classroom)

        resp = self.client.get(reverse('api-module-list'))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual([item['day'] for item in resp.data['results']], [1])
        self.assertEqual(resp.data['results'][0]['title'], "Intro")

    def test_module_detail_rejects_cross_classroom_module(self):
        self.authenticate_student()
        other_classroom = Classroom.objects.create(name="Other", teacher=self.teacher)
        other_module = Module.objects.create(day=2, title="Other", content="hidden", classroom=other_classroom)

        resp = self.client.get(reverse('api-module-detail', args=[other_module.id]))

        self.assertEqual(resp.status_code, 404)

    def test_unreleased_module_is_hidden_from_list_and_detail(self):
        self.module_assignment.release_date = timezone.now() + timedelta(hours=1)
        self.module_assignment.save(update_fields=['release_date'])
        self.authenticate_student()

        listing = self.client.get(reverse('api-module-list'))
        detail = self.client.get(reverse('api-module-detail', args=[self.module.id]))

        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data['results'], [])
        self.assertEqual(detail.status_code, 404)

    def test_module_release_at_current_time_is_available(self):
        self.module_assignment.release_date = timezone.now()
        self.module_assignment.save(update_fields=['release_date'])
        self.authenticate_student()

        resp = self.client.get(reverse('api-module-detail', args=[self.module.id]))

        self.assertEqual(resp.status_code, 200)

    def test_unreleased_module_rejects_response_submission_and_detail(self):
        user = self.authenticate_student()
        StudentResponse.objects.create(student=user, module=self.module, answers={'old': True})
        self.module_assignment.release_date = timezone.now() + timedelta(hours=1)
        self.module_assignment.save(update_fields=['release_date'])

        submission = self.client.post(
            reverse('api-module-response', args=[1]),
            {'answers': {'new': True}},
            format='json',
        )
        detail = self.client.get(reverse('api-module-response-detail', args=[1]))

        self.assertEqual(submission.status_code, 404)
        self.assertEqual(detail.status_code, 404)
        self.assertEqual(StudentResponse.objects.get().answers, {'old': True})

    def test_response_upsert_creates_and_updates_by_day(self):
        user = self.authenticate_student()

        create = self.client.post(reverse('api-module-response', args=[1]), {"answers": {"a": "one"}}, format='json')
        update = self.client.post(reverse('api-module-response', args=[1]), {"answers": {"a": "two"}}, format='json')

        self.assertEqual(create.status_code, 201)
        self.assertEqual(update.status_code, 200)
        self.assertEqual(StudentResponse.objects.get(student=user, module=self.module).answers, {"a": "two"})

    def test_response_upsert_rejects_missing_answers(self):
        self.authenticate_student()

        resp = self.client.post(reverse('api-module-response', args=[1]), {}, format='json')

        self.assertEqual(resp.status_code, 400)
        self.assertIn('answers', resp.data)

    def test_response_upsert_rejects_unsupported_file_type(self):
        self.authenticate_student()
        upload = SimpleUploadedFile("script.exe", b"bad", content_type="application/octet-stream")

        resp = self.client.post(
            reverse('api-module-response', args=[1]),
            {"answers": "{}", "file_upload": upload},
            format='multipart',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('file_upload', resp.data)

    def test_response_upsert_rejects_oversized_file(self):
        self.authenticate_student()
        upload = SimpleUploadedFile(
            "large.pdf",
            b"0" * (5 * 1024 * 1024 + 1),
            content_type="application/pdf",
        )

        resp = self.client.post(
            reverse('api-module-response', args=[1]),
            {"answers": "{}", "file_upload": upload},
            format='multipart',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('file_upload', resp.data)

    def test_response_detail_returns_only_current_students_response(self):
        user = self.authenticate_student()
        other = User.objects.create_user(username="other", password="pw", is_student=True)
        Student.objects.create(user=other, classroom=self.classroom, first_name="", last_name="")
        StudentResponse.objects.create(student=other, module=self.module, answers={"hidden": True})
        StudentResponse.objects.create(student=user, module=self.module, answers={"own": True})

        resp = self.client.get(reverse('api-module-response-detail', args=[1]))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['answers'], {"own": True})

    def test_response_file_download_is_private_to_owning_student(self):
        user = self.authenticate_student()
        response_record = StudentResponse.objects.create(
            student=user,
            module=self.module,
            answers={},
            file_upload=SimpleUploadedFile(
                'answer.pdf',
                b'%PDF-1.4\n%%EOF',
                content_type='application/pdf',
            ),
        )

        own = self.client.get(reverse('api-response-file', args=[response_record.id]))
        other = User.objects.create_user(username='download-other', password='pw', is_student=True)
        Student.objects.create(user=other, classroom=self.classroom, first_name='', last_name='')
        self.client.force_authenticate(other)
        denied = self.client.get(reverse('api-response-file', args=[response_record.id]))

        self.assertEqual(own.status_code, 200)
        self.assertIn('attachment', own['Content-Disposition'])
        self.assertEqual(own['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(denied.status_code, 404)

    def test_response_detail_404_when_missing(self):
        self.authenticate_student()

        resp = self.client.get(reverse('api-module-response-detail', args=[1]))

        self.assertEqual(resp.status_code, 404)

    def test_response_upsert_404_for_day_not_in_students_classroom(self):
        self.authenticate_student()

        resp = self.client.post(reverse('api-module-response', args=[2]), {"answers": {}}, format='json')

        self.assertEqual(resp.status_code, 404)

    def test_inbox_read_toggle(self):
        user = self.authenticate_student()
        sender, _ = User.objects.get_or_create(username="virtual_scientist")
        msg = Message.objects.create(sender=sender, recipient=user, subject="Read me", body="Body")

        resp = self.client.patch(reverse('api-inbox-read', args=[msg.id]), {"is_read": True}, format='json')

        self.assertEqual(resp.status_code, 200)
        msg.refresh_from_db()
        self.assertTrue(msg.is_read)

    def test_inbox_read_toggle_rejects_message_for_other_user(self):
        self.authenticate_student()
        other = User.objects.create_user(username="other", password="pw", is_student=True)
        sender, _ = User.objects.get_or_create(username="virtual_scientist")
        msg = Message.objects.create(sender=sender, recipient=other, subject="Private", body="Body")

        resp = self.client.patch(reverse('api-inbox-read', args=[msg.id]), {"is_read": True}, format='json')

        self.assertEqual(resp.status_code, 404)

    def test_inbox_lists_virtual_scientist_and_own_classroom_teacher_only(self):
        user = self.authenticate_student()
        vs, _ = User.objects.get_or_create(username="virtual_scientist")
        other_teacher = User.objects.create_user(username="teacher-message", password="pw", is_teacher=True)
        Message.objects.create(sender=vs, recipient=user, subject="Visible", body="Body")
        Message.objects.create(sender=self.teacher, recipient=user, subject="Teacher visible", body="Body")
        Message.objects.create(sender=other_teacher, recipient=user, subject="Hidden sender", body="Body")

        resp = self.client.get(reverse('api-inbox'))

        self.assertEqual(resp.status_code, 200)
        subjects = [item['subject'] for item in resp.data['results']]
        self.assertIn("Visible", subjects)
        self.assertIn("Teacher visible", subjects)
        self.assertNotIn("Hidden sender", subjects)

    def test_inbox_attachment_download_rejects_other_recipients(self):
        user = self.authenticate_student()
        message = Message.objects.create(
            sender=self.teacher,
            recipient=user,
            subject='Private attachment',
            body='Body',
            attachment=SimpleUploadedFile('guide.pdf', b'%PDF-1.4\n%%EOF'),
        )

        own = self.client.get(reverse('api-inbox-attachment', args=[message.id]))
        other = User.objects.create_user(username='attachment-other', password='pw', is_student=True)
        Student.objects.create(user=other, classroom=self.classroom, first_name='', last_name='')
        self.client.force_authenticate(other)
        denied = self.client.get(reverse('api-inbox-attachment', args=[message.id]))

        self.assertEqual(own.status_code, 200)
        self.assertIn('attachment', own['Content-Disposition'])
        self.assertEqual(denied.status_code, 404)

    def test_quiz_flow(self):
        self.authenticate_student()

        questions = self.client.get(reverse('api-quiz-pre'))
        attempt = self.client.post(
            reverse('api-quiz-attempt'),
            {
                "quiz_type": "pre",
                "score": 1,
                "attempt_data": {"answers": {str(self.pre_question.id): "A"}},
            },
            format='json',
        )
        progress = self.client.get(reverse('api-progress'))

        self.assertEqual(questions.status_code, 200)
        self.assertEqual(len(questions.data['results']), 1)
        self.assertEqual(attempt.status_code, 201)
        self.assertEqual(attempt.data['score'], 100.0)
        self.assertEqual(progress.data['pre_score'], 100.0)

    def test_unreleased_quiz_hides_questions_and_rejects_submission(self):
        self.pre_assignment.release_date = timezone.now() + timedelta(hours=1)
        self.pre_assignment.save(update_fields=['release_date'])
        self.authenticate_student()

        questions = self.client.get(reverse('api-quiz-pre'))
        attempt = self.client.post(
            reverse('api-quiz-attempt'),
            {
                'quiz_type': 'pre',
                'attempt_data': {'answers': {str(self.pre_question.id): 'A'}},
            },
            format='json',
        )

        self.assertEqual(questions.status_code, 200)
        self.assertEqual(questions.data['results'], [])
        self.assertEqual(attempt.status_code, 404)
        self.assertFalse(QuizAttempt.objects.exists())

    def test_quiz_release_at_current_time_allows_submission(self):
        self.pre_assignment.release_date = timezone.now()
        self.pre_assignment.save(update_fields=['release_date'])
        self.authenticate_student()

        attempt = self.client.post(
            reverse('api-quiz-attempt'),
            {
                'quiz_type': 'pre',
                'attempt_data': {'answers': {str(self.pre_question.id): 'A'}},
            },
            format='json',
        )

        self.assertEqual(attempt.status_code, 201)
        self.assertEqual(attempt.data['score'], 100.0)

    def test_quiz_attempt_updates_existing_attempt(self):
        self.authenticate_student()

        first = self.client.post(
            reverse('api-quiz-attempt'),
            {
                "quiz_type": "pre",
                "attempt_data": {"answers": {str(self.pre_question.id): "A"}},
            },
            format='json',
        )
        second = self.client.post(
            reverse('api-quiz-attempt'),
            {
                "quiz_type": "pre",
                "attempt_data": {"answers": {str(self.pre_question.id): "B"}},
            },
            format='json',
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(QuizAttempt.objects.get(quiz_type="pre").score, 0)

    def test_quiz_attempt_rejects_invalid_type(self):
        self.authenticate_student()

        resp = self.client.post(
            reverse('api-quiz-attempt'),
            {"quiz_type": "mid", "attempt_data": {"answers": {}}},
            format='json',
        )

        self.assertEqual(resp.status_code, 400)

    def test_quiz_attempt_rejects_type_without_classroom_question(self):
        other_classroom = Classroom.objects.create(name="No Questions", teacher=self.teacher)
        self.authenticate_student(classroom=other_classroom)

        resp = self.client.post(
            reverse('api-quiz-attempt'),
            {"quiz_type": "pre", "attempt_data": {"answers": {}}},
            format='json',
        )

        self.assertEqual(resp.status_code, 404)

    def test_quiz_attempt_ignores_forged_score_and_scores_answers(self):
        self.authenticate_student()

        resp = self.client.post(
            reverse('api-quiz-attempt'),
            {
                "quiz_type": "pre",
                "score": 100,
                "attempt_data": {"answers": {str(self.pre_question.id): "B"}},
            },
            format='json',
        )

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['score'], 0.0)
        self.assertEqual(QuizAttempt.objects.get().score, 0.0)

    def test_quiz_attempt_rejects_unknown_question_id(self):
        self.authenticate_student()

        resp = self.client.post(
            reverse('api-quiz-attempt'),
            {
                "quiz_type": "pre",
                "attempt_data": {"answers": {str(self.pre_question.id + 999): "A"}},
            },
            format='json',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('unknown_question_ids', resp.data['attempt_data'])

    def test_quiz_attempt_rejects_missing_answer(self):
        self.authenticate_student()

        resp = self.client.post(
            reverse('api-quiz-attempt'),
            {"quiz_type": "pre", "attempt_data": {"answers": {}}},
            format='json',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('missing_question_ids', resp.data['attempt_data'])

    def test_quiz_attempt_rejects_choice_not_offered_for_question(self):
        self.authenticate_student()

        resp = self.client.post(
            reverse('api-quiz-attempt'),
            {
                "quiz_type": "pre",
                "attempt_data": {"answers": {str(self.pre_question.id): "Z"}},
            },
            format='json',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn(str(self.pre_question.id), resp.data['attempt_data']['answers'])

    def test_progress_empty_state(self):
        self.authenticate_student()

        resp = self.client.get(reverse('api-progress'))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['completed_days'], [])
        self.assertIsNone(resp.data['pre_score'])
        self.assertIsNone(resp.data['post_score'])


class StudentAPIAuthMatrixTests(APITestCase):
    def test_student_routes_require_authentication(self):
        routes = [
            ('get', reverse('api-student-profile')),
            ('get', reverse('api-module-list')),
            ('get', reverse('api-module-detail', args=[1])),
            ('post', reverse('api-module-response', args=[1])),
            ('get', reverse('api-module-response-detail', args=[1])),
            ('get', reverse('api-quiz-pre')),
            ('get', reverse('api-quiz-post')),
            ('post', reverse('api-quiz-attempt')),
            ('get', reverse('api-progress')),
            ('get', reverse('api-inbox')),
            ('patch', reverse('api-inbox-read', args=[1])),
        ]

        for method, url in routes:
            with self.subTest(method=method, url=url):
                resp = getattr(self.client, method)(url, {}, format='json')
                self.assertEqual(resp.status_code, 401)


THROTTLE_TEST_SETTINGS = {
    **settings.REST_FRAMEWORK,
    'DEFAULT_THROTTLE_RATES': {
        **settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
        'token_obtain': '1/minute',
        'token_refresh': '1/minute',
        'signup': '1/minute',
        'guest_login': '1/minute',
    },
}


@override_settings(REST_FRAMEWORK=THROTTLE_TEST_SETTINGS)
class SensitiveEndpointThrottleTests(APITestCase):
    def setUp(self):
        throttle_rates = THROTTLE_TEST_SETTINGS['DEFAULT_THROTTLE_RATES']
        throttle_patch = patch.object(ScopedRateThrottle, 'THROTTLE_RATES', throttle_rates)
        throttle_patch.start()
        self.addCleanup(throttle_patch.stop)
        cache.clear()
        self.teacher = User.objects.create_user(
            username='throttle-teacher',
            password='Teacher-Pass!2026',
            is_teacher=True,
        )
        self.classroom = Classroom.objects.create(name='1001', teacher=self.teacher)
        self.student = User.objects.create_user(
            username='throttle-student',
            password='Student-Pass!2026',
            is_student=True,
        )
        Student.objects.create(
            user=self.student,
            classroom=self.classroom,
            first_name='Throttle',
            last_name='Student',
        )

    def test_login_throttle_counts_failed_attempts(self):
        first = self.client.post(
            reverse('token_obtain_pair'),
            {'username': self.student.username, 'password': 'wrong'},
            format='json',
        )
        second = self.client.post(
            reverse('token_obtain_pair'),
            {'username': self.student.username, 'password': 'still-wrong'},
            format='json',
        )

        self.assertEqual(first.status_code, 401)
        self.assertEqual(second.status_code, 429)

    def test_refresh_has_independent_scope_and_limit(self):
        refresh = str(RefreshToken.for_user(self.student))

        first = self.client.post(reverse('token_refresh'), {'refresh': refresh}, format='json')
        second = self.client.post(reverse('token_refresh'), {'refresh': refresh}, format='json')

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)

    def test_signup_has_independent_scope_and_limit(self):
        payload = {
            'password': 'S3cure-Science!2026',
            'first_name': 'New',
            'last_name': 'Student',
            'classroom_name': self.classroom.name,
        }

        first = self.client.post(
            reverse('api-signup'),
            {**payload, 'username': 'signup-one'},
            format='json',
        )
        second = self.client.post(
            reverse('api-signup'),
            {**payload, 'username': 'signup-two'},
            format='json',
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 429)

    def test_guest_login_has_independent_scope_and_limit(self):
        first = self.client.post(reverse('api-guest-login'), {}, format='json')
        second = self.client.post(reverse('api-guest-login'), {}, format='json')

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 429)
