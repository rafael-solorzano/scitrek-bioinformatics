from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.db import IntegrityError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from kombu.exceptions import OperationalError
from rest_framework.test import APITestCase

from classroom_admin.models import (
    Classroom,
    CustomUser,
    ModuleAssignment,
    QuizAssignment,
    ScheduledMessage,
    Student,
)
from classroom_admin.api_views import csv_safe
from student_activities.models import Message, Module, QuizAttempt, QuizQuestion, StudentResponse
from workbooks.models import Question, Section, Workbook


class SeedDevCommandTests(SimpleTestCase):
    @override_settings(DEBUG=False)
    def test_seed_dev_refuses_to_run_with_production_debug_setting(self):
        with self.assertRaisesMessage(CommandError, "seed_dev is only allowed"):
            call_command("seed_dev")


class SeedE2ECommandTests(TestCase):
    @override_settings(DEBUG=False, E2E_RESET_ALLOWED=False)
    def test_seed_e2e_refuses_to_run_with_production_debug_setting(self):
        with self.assertRaisesMessage(CommandError, "seed_e2e is only allowed"):
            call_command("seed_e2e")

    @override_settings(DEBUG=True)
    def test_seed_e2e_reset_creates_deterministic_fixture_set(self):
        call_command("seed_e2e", "--reset", verbosity=0, stdout=StringIO())

        teacher = CustomUser.objects.get(username="teacher1001")
        student = CustomUser.objects.get(username="student1001")
        alt_student = CustomUser.objects.get(username="student_alt")
        classroom = Classroom.objects.get(name="1001")

        self.assertTrue(teacher.is_teacher)
        self.assertTrue(student.is_student)
        self.assertTrue(alt_student.is_student)
        self.assertEqual(student.student_profile.classroom, classroom)
        self.assertEqual(Module.objects.filter(classroom=classroom).count(), 5)
        self.assertEqual(ModuleAssignment.objects.filter(classroom=classroom).count(), 5)
        self.assertEqual(QuizAssignment.objects.filter(classroom=classroom).count(), 2)
        self.assertEqual(QuizQuestion.objects.filter(classroom=classroom).count(), 2)
        self.assertGreaterEqual(Message.objects.filter(recipient=student, is_read=False).count(), 1)

        workbook = Workbook.objects.get(title="E2E Student Workbook")
        self.assertEqual(Section.objects.filter(workbook=workbook).count(), 9)
        self.assertEqual(Question.objects.filter(workbook=workbook).count(), 1)

    @override_settings(DEBUG=True)
    def test_seed_e2e_reset_is_repeatable_without_duplicate_core_records(self):
        call_command("seed_e2e", "--reset", verbosity=0, stdout=StringIO())
        call_command("seed_e2e", "--reset", verbosity=0, stdout=StringIO())

        classroom = Classroom.objects.get(name="1001")

        self.assertEqual(CustomUser.objects.filter(username="teacher1001").count(), 1)
        self.assertEqual(CustomUser.objects.filter(username="student1001").count(), 1)
        self.assertEqual(CustomUser.objects.filter(username="student_alt").count(), 1)
        self.assertEqual(Classroom.objects.filter(name="1001").count(), 1)
        self.assertEqual(Module.objects.filter(classroom=classroom).count(), 5)
        self.assertEqual(Workbook.objects.filter(title="E2E Student Workbook").count(), 1)


class TeacherAPITestCase(APITestCase):
    def setUp(self):
        self.teacher = CustomUser.objects.create_user(
            username="teacher", password="pass", is_teacher=True
        )
        self.other_teacher = CustomUser.objects.create_user(
            username="other-teacher", password="pass", is_teacher=True
        )
        self.student = CustomUser.objects.create_user(
            username="student", password="pass", first_name="Stu", last_name="Dent", is_student=True
        )
        self.other_student = CustomUser.objects.create_user(
            username="other-student", password="pass", first_name="Other", last_name="Learner", is_student=True
        )
        self.classroom = Classroom.objects.create(
            name="Bio 101", description="Morning class", teacher=self.teacher
        )
        self.other_classroom = Classroom.objects.create(
            name="Bio 202", description="Afternoon class", teacher=self.other_teacher
        )
        self.profile = Student.objects.create(
            user=self.student,
            classroom=self.classroom,
            first_name=self.student.first_name,
            last_name=self.student.last_name,
        )
        self.other_profile = Student.objects.create(
            user=self.other_student,
            classroom=self.other_classroom,
            first_name=self.other_student.first_name,
            last_name=self.other_student.last_name,
        )
        self.module = Module.objects.create(
            day=1, title="Intro", content="Module content", classroom=self.classroom
        )
        self.other_module = Module.objects.create(
            day=1, title="Other Intro", content="Module content", classroom=self.other_classroom
        )

    def as_teacher(self):
        self.client.force_authenticate(self.teacher)

    def as_student(self):
        self.client.force_authenticate(self.student)


class ClassroomAuthorizationTests(TeacherAPITestCase):
    def test_teacher_endpoints_reject_anonymous_users(self):
        endpoints = [
            ("get", reverse("teacher-classroom-list")),
            ("post", reverse("teacher-classroom-list")),
            ("get", reverse("teacher-classroom-detail", args=[self.classroom.id])),
            ("get", reverse("teacher-roster-list", args=[self.classroom.id])),
            ("post", reverse("teacher-roster-add", args=[self.classroom.id])),
            ("get", reverse("teacher-assign-modules", args=[self.classroom.id])),
            ("get", reverse("teacher-assign-quizzes", args=[self.classroom.id])),
            ("get", reverse("teacher-schedule-messages", args=[self.classroom.id])),
            ("get", reverse("teacher-classroom-progress", args=[self.classroom.id])),
            ("get", reverse("teacher-classroom-quizzes", args=[self.classroom.id])),
            ("get", reverse("teacher-export-roster", args=[self.classroom.id])),
        ]

        for method, url in endpoints:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, {})
                self.assertEqual(response.status_code, 401)

    def test_teacher_endpoints_reject_student_users(self):
        self.as_student()
        endpoints = [
            ("get", reverse("teacher-classroom-list")),
            ("post", reverse("teacher-classroom-list")),
            ("get", reverse("teacher-classroom-detail", args=[self.classroom.id])),
            ("get", reverse("teacher-roster-list", args=[self.classroom.id])),
            ("post", reverse("teacher-roster-add", args=[self.classroom.id])),
            ("get", reverse("teacher-classroom-progress", args=[self.classroom.id])),
        ]

        for method, url in endpoints:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, {})
                self.assertEqual(response.status_code, 403)

    def test_teacher_cannot_access_another_teachers_classroom_detail(self):
        self.as_teacher()

        response = self.client.get(reverse("teacher-classroom-detail", args=[self.other_classroom.id]))

        self.assertEqual(response.status_code, 404)

    def test_teacher_cannot_access_another_teachers_roster(self):
        self.as_teacher()

        response = self.client.get(reverse("teacher-roster-list", args=[self.other_classroom.id]))

        self.assertEqual(response.status_code, 404)

    def test_teacher_cannot_export_another_teachers_classroom(self):
        self.as_teacher()

        response = self.client.get(reverse("teacher-export-roster", args=[self.other_classroom.id]))

        self.assertEqual(response.status_code, 404)


class ClassroomCrudTests(TeacherAPITestCase):
    def test_teacher_lists_only_own_classrooms(self):
        self.as_teacher()

        response = self.client.get(reverse("teacher-classroom-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["name"] for item in response.data["results"]], ["Bio 101"])

    def test_teacher_creates_classroom_attached_to_self(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-classroom-list"),
            {"name": "Genomics Lab", "description": "Lab section"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        classroom = Classroom.objects.get(name="Genomics Lab")
        self.assertEqual(classroom.teacher, self.teacher)

    def test_classroom_create_requires_unique_name(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-classroom-list"),
            {"name": self.classroom.name, "description": "Duplicate"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.data)

    def test_teacher_updates_own_classroom(self):
        self.as_teacher()

        response = self.client.patch(
            reverse("teacher-classroom-detail", args=[self.classroom.id]),
            {"description": "Updated"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.classroom.refresh_from_db()
        self.assertEqual(self.classroom.description, "Updated")

    def test_teacher_cannot_delete_classroom_and_cascade_student_work(self):
        response_record = StudentResponse.objects.create(
            student=self.student,
            module=self.module,
            answers={'retain': True},
        )
        self.as_teacher()

        response = self.client.delete(reverse("teacher-classroom-detail", args=[self.classroom.id]))

        self.assertEqual(response.status_code, 405)
        self.assertTrue(Classroom.objects.filter(id=self.classroom.id).exists())
        self.assertTrue(StudentResponse.objects.filter(pk=response_record.pk).exists())


class RosterAPITests(TeacherAPITestCase):
    def test_roster_lists_students_in_classroom_only(self):
        self.as_teacher()

        response = self.client.get(reverse("teacher-roster-list", args=[self.classroom.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["username"], self.student.username)

    def test_roster_add_creates_missing_profile_with_required_names(self):
        new_student = CustomUser.objects.create_user(
            username="new-student", password="pass", first_name="New", last_name="Kid", is_student=True
        )
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-roster-add", args=[self.classroom.id]),
            {"student_username": new_student.username},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        profile = Student.objects.get(user=new_student)
        self.assertEqual(profile.classroom, self.classroom)
        self.assertEqual(profile.first_name, "New")
        self.assertEqual(profile.last_name, "Kid")

    def test_roster_add_rejects_student_owned_by_another_classroom(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-roster-add", args=[self.classroom.id]),
            {"student_username": self.other_student.username},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.other_profile.refresh_from_db()
        self.assertEqual(self.other_profile.classroom, self.other_classroom)

    def test_roster_add_accepts_unassigned_student_profile(self):
        self.other_profile.classroom = None
        self.other_profile.save(update_fields=['classroom'])
        self.as_teacher()

        response = self.client.post(
            reverse('teacher-roster-add', args=[self.classroom.id]),
            {'student_username': self.other_student.username},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.other_profile.refresh_from_db()
        self.assertEqual(self.other_profile.classroom, self.classroom)

    def test_roster_add_accepts_existing_classroom_member(self):
        self.as_teacher()

        response = self.client.post(
            reverse('teacher-roster-add', args=[self.classroom.id]),
            {'student_username': self.student.username},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.classroom, self.classroom)

    def test_roster_add_rejects_unknown_student(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-roster-add", args=[self.classroom.id]),
            {"student_username": "missing"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_roster_add_rejects_teacher_account(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-roster-add", args=[self.classroom.id]),
            {"student_username": self.other_teacher.username},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_roster_remove_sets_classroom_to_null(self):
        self.as_teacher()

        response = self.client.delete(
            reverse("teacher-roster-remove", args=[self.classroom.id, self.student.id])
        )

        self.assertEqual(response.status_code, 204)
        self.profile.refresh_from_db()
        self.assertIsNone(self.profile.classroom)

    def test_roster_remove_does_not_remove_student_from_other_classroom(self):
        self.as_teacher()

        response = self.client.delete(
            reverse("teacher-roster-remove", args=[self.classroom.id, self.other_student.id])
        )

        self.assertEqual(response.status_code, 404)
        self.other_profile.refresh_from_db()
        self.assertEqual(self.other_profile.classroom, self.other_classroom)


class AssignmentAPITests(TeacherAPITestCase):
    def test_module_assignment_create_with_future_release_date(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-assign-modules", args=[self.classroom.id]),
            {"module": self.module.id, "release_date": (timezone.now() + timedelta(days=1)).isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ModuleAssignment.objects.get().classroom, self.classroom)

    def test_module_assignment_rejects_past_release_date(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-assign-modules", args=[self.classroom.id]),
            {"module": self.module.id, "release_date": (timezone.now() - timedelta(days=1)).isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("release_date", response.data)

    def test_module_assignment_duplicate_is_rejected(self):
        ModuleAssignment.objects.create(classroom=self.classroom, module=self.module)
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-assign-modules", args=[self.classroom.id]),
            {"module": self.module.id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_module_assignment_detail_is_scoped_to_teacher_classroom(self):
        assignment = ModuleAssignment.objects.create(classroom=self.other_classroom, module=self.other_module)
        self.as_teacher()

        response = self.client.get(
            reverse("teacher-assign-module-detail", args=[self.classroom.id, assignment.id])
        )

        self.assertEqual(response.status_code, 404)

    def test_quiz_assignment_create_and_list(self):
        self.as_teacher()

        create_response = self.client.post(
            reverse("teacher-assign-quizzes", args=[self.classroom.id]),
            {"quiz_type": "pre"},
            format="json",
        )
        list_response = self.client.get(reverse("teacher-assign-quizzes", args=[self.classroom.id]))

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["results"][0]["quiz_type"], "pre")

    def test_quiz_assignment_rejects_invalid_type(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-assign-quizzes", args=[self.classroom.id]),
            {"quiz_type": "mid"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("quiz_type", response.data)

    def test_quiz_assignment_rejects_past_release_date(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-assign-quizzes", args=[self.classroom.id]),
            {"quiz_type": "post", "release_date": (timezone.now() - timedelta(minutes=1)).isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("release_date", response.data)


class ScheduledMessageAPITests(TeacherAPITestCase):
    def test_scheduled_message_create_queues_task(self):
        self.as_teacher()

        with patch("classroom_admin.api_views.schedule_message_task.apply_async") as apply_async:
            response = self.client.post(
                reverse("teacher-schedule-messages", args=[self.classroom.id]),
                {
                    "subject": "Reminder",
                    "body": "Bring notebooks",
                    "scheduled_time": (timezone.now() + timedelta(hours=1)).isoformat(),
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        apply_async.assert_called_once()

    def test_scheduled_message_create_reports_queue_failure_without_false_success(self):
        self.as_teacher()

        with patch(
            "classroom_admin.api_views.schedule_message_task.apply_async",
            side_effect=OperationalError,
        ):
            response = self.client.post(
                reverse("teacher-schedule-messages", args=[self.classroom.id]),
                {
                    "subject": "Queue down",
                    "body": "Must not be silently lost",
                    "scheduled_time": (timezone.now() + timedelta(hours=1)).isoformat(),
                },
                format="json",
            )

        self.assertEqual(response.status_code, 503)
        self.assertFalse(ScheduledMessage.objects.filter(subject="Queue down").exists())

    def test_scheduled_message_rejects_past_time(self):
        self.as_teacher()

        response = self.client.post(
            reverse("teacher-schedule-messages", args=[self.classroom.id]),
            {
                "subject": "Past",
                "body": "Nope",
                "scheduled_time": (timezone.now() - timedelta(hours=1)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("scheduled_time", response.data)

    def test_send_now_falls_back_to_synchronous_send_when_queue_fails(self):
        msg = ScheduledMessage.objects.create(
            classroom=self.classroom,
            subject="Now",
            body="Immediate",
            scheduled_time=timezone.now() + timedelta(hours=1),
        )
        self.as_teacher()

        with patch("classroom_admin.api_views.send_scheduled_message_task.delay", side_effect=OperationalError):
            response = self.client.patch(
                reverse("teacher-send-message-now", args=[self.classroom.id, msg.id])
            )

        self.assertEqual(response.status_code, 200)
        msg.refresh_from_db()
        self.assertTrue(msg.sent)
        self.assertEqual(Message.objects.filter(recipient=self.student, subject="Now").count(), 1)

    def test_send_now_is_idempotent_for_same_subject(self):
        msg = ScheduledMessage.objects.create(
            classroom=self.classroom,
            subject="Repeat",
            body="Version 1",
            scheduled_time=timezone.now() + timedelta(hours=1),
        )

        from classroom_admin.tasks import send_scheduled_message_task

        send_scheduled_message_task(msg.id)
        msg.body = "Version 2"
        msg.save(update_fields=["body"])
        send_scheduled_message_task(msg.id)

        self.assertEqual(Message.objects.filter(recipient=self.student, subject="Repeat").count(), 1)
        self.assertEqual(Message.objects.get(recipient=self.student, subject="Repeat").body, "Version 2")

    def test_scheduled_message_attachment_is_delivered_by_private_storage_reference(self):
        msg = ScheduledMessage.objects.create(
            classroom=self.classroom,
            subject="Guide",
            body="Read this",
            attachment="teacher_messages/guide.pdf",
            scheduled_time=timezone.now() + timedelta(hours=1),
        )

        from classroom_admin.tasks import send_scheduled_message_task

        send_scheduled_message_task(msg.id)

        delivered = Message.objects.get(recipient=self.student, subject="Guide")
        self.assertEqual(delivered.attachment.name, "teacher_messages/guide.pdf")

    def test_send_now_is_scoped_to_teacher_classroom(self):
        msg = ScheduledMessage.objects.create(
            classroom=self.other_classroom,
            subject="Private",
            body="No access",
            scheduled_time=timezone.now() + timedelta(hours=1),
        )
        self.as_teacher()

        response = self.client.patch(reverse("teacher-send-message-now", args=[self.classroom.id, msg.id]))

        self.assertEqual(response.status_code, 404)


class ReportingAndExportTests(TeacherAPITestCase):
    def test_progress_report_empty_classroom_returns_zero_percentages(self):
        self.profile.classroom = None
        self.profile.save(update_fields=["classroom"])
        self.as_teacher()

        response = self.client.get(reverse("teacher-classroom-progress", args=[self.classroom.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_students"], 0)
        self.assertTrue(all(row["percent"] == 0 for row in response.data["by_day"]))

    def test_progress_report_counts_completed_modules_by_day(self):
        StudentResponse.objects.create(student=self.student, module=self.module, answers={"done": True})
        self.as_teacher()

        response = self.client.get(reverse("teacher-classroom-progress", args=[self.classroom.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["by_day"][0]["completed"], 1)
        self.assertEqual(response.data["by_day"][0]["percent"], 100)

    def test_quiz_overview_returns_average_and_scores(self):
        QuizAttempt.objects.create(
            student=self.student,
            classroom=self.classroom,
            quiz_type="pre",
            score=80,
            attempt_data={},
        )
        self.as_teacher()

        response = self.client.get(reverse("teacher-classroom-quizzes", args=[self.classroom.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pre"]["average"], 80)
        self.assertEqual(response.data["pre"]["scores"], [80.0])
        self.assertEqual(response.data["post"]["average"], 0)

    def test_student_detail_is_scoped_and_includes_activity(self):
        StudentResponse.objects.create(student=self.student, module=self.module, answers={"a": 1})
        QuizAttempt.objects.create(
            student=self.student,
            classroom=self.classroom,
            quiz_type="pre",
            score=90,
            attempt_data={"q": "a"},
        )
        Message.objects.create(sender=self.teacher, recipient=self.student, subject="Hi", body="Body")
        self.as_teacher()

        response = self.client.get(
            reverse("teacher-student-details", args=[self.classroom.id, self.student.id])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["student"]["username"], self.student.username)
        self.assertEqual(len(response.data["responses"]), 1)
        self.assertEqual(len(response.data["quizzes"]), 1)
        self.assertIn("Hi", [item["subject"] for item in response.data["inbox"]])

    def test_student_detail_excludes_records_from_another_classroom_context(self):
        StudentResponse.objects.create(
            student=self.student,
            module=self.other_module,
            answers={'private': 'other classroom'},
        )
        QuizAttempt.objects.create(
            student=self.student,
            classroom=self.other_classroom,
            quiz_type='pre',
            score=100,
            attempt_data={'answers': {}},
        )
        QuizAttempt.objects.create(
            student=self.student,
            classroom=None,
            quiz_type='post',
            score=75,
            attempt_data={'answers': {'legacy': 'must remain hidden'}},
        )
        Message.objects.create(
            sender=self.other_teacher,
            recipient=self.student,
            subject='Other classroom message',
            body='Private',
        )
        self.as_teacher()

        response = self.client.get(
            reverse('teacher-student-details', args=[self.classroom.id, self.student.id])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['responses'], [])
        self.assertEqual(response.data['quizzes'], [])
        self.assertEqual(response.data['inbox'], [])

    def test_student_detail_rejects_student_outside_classroom(self):
        self.as_teacher()

        response = self.client.get(
            reverse("teacher-student-details", args=[self.classroom.id, self.other_student.id])
        )

        self.assertEqual(response.status_code, 404)

    def test_roster_export_contains_csv_header_and_student(self):
        self.as_teacher()

        response = self.client.get(reverse("teacher-export-roster", args=[self.classroom.id]))

        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn("id,username,first_name,last_name", body)
        self.assertIn(self.student.username, body)

    def test_roster_export_escapes_spreadsheet_formulas(self):
        self.student.username = "=cmd"
        self.student.first_name = "+first"
        self.student.last_name = "@last"
        self.student.save(update_fields=["username", "first_name", "last_name"])
        self.profile.first_name = "+first"
        self.profile.last_name = "@last"
        self.profile.save(update_fields=["first_name", "last_name"])
        self.as_teacher()

        response = self.client.get(reverse("teacher-export-roster", args=[self.classroom.id]))

        body = response.content.decode()
        self.assertIn("'=cmd", body)
        self.assertIn("'+first", body)
        self.assertIn("'@last", body)

    def test_roster_export_sanitizes_content_disposition_filename(self):
        self.classroom.name = 'Biology "Lab"\r\nInjected: value'
        self.classroom.save(update_fields=['name'])
        self.as_teacher()

        response = self.client.get(reverse('teacher-export-roster', args=[self.classroom.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response['Content-Disposition'],
            'attachment; filename="roster_biology-lab-injected-value.csv"',
        )

    def test_progress_export_contains_five_days(self):
        self.as_teacher()

        response = self.client.get(reverse("teacher-export-progress", args=[self.classroom.id]))

        self.assertEqual(response.status_code, 200)
        lines = response.content.decode().strip().splitlines()
        self.assertEqual(lines[0], "day,completed,percent")
        self.assertEqual(len(lines), 6)

    def test_quiz_export_contains_attempts(self):
        QuizAttempt.objects.create(
            student=self.student,
            classroom=self.classroom,
            quiz_type="post",
            score=75,
            attempt_data={},
        )
        self.as_teacher()

        response = self.client.get(reverse("teacher-export-quizzes", args=[self.classroom.id]))

        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn("quiz_type,student_id,username,score", body)
        self.assertIn("post", body)

    def test_quiz_export_escapes_formula_usernames(self):
        self.student.username = "-formula"
        self.student.save(update_fields=["username"])
        QuizAttempt.objects.create(
            student=self.student,
            classroom=self.classroom,
            quiz_type="post",
            score=75,
            attempt_data={},
        )
        self.as_teacher()

        response = self.client.get(reverse("teacher-export-quizzes", args=[self.classroom.id]))

        self.assertIn("'-formula", response.content.decode())


class ClassroomModelIntegrityTests(TeacherAPITestCase):
    def test_module_assignment_unique_per_classroom_and_module(self):
        ModuleAssignment.objects.create(classroom=self.classroom, module=self.module)

        with self.assertRaises(IntegrityError):
            ModuleAssignment.objects.create(classroom=self.classroom, module=self.module)

    def test_quiz_assignment_unique_per_classroom_and_type(self):
        QuizAssignment.objects.create(classroom=self.classroom, quiz_type="pre")

        with self.assertRaises(IntegrityError):
            QuizAssignment.objects.create(classroom=self.classroom, quiz_type="pre")

    def test_string_representations_are_human_readable(self):
        assignment = ModuleAssignment.objects.create(classroom=self.classroom, module=self.module)
        quiz = QuizAssignment.objects.create(classroom=self.classroom, quiz_type="pre")
        scheduled = ScheduledMessage.objects.create(
            classroom=self.classroom,
            subject="Subject",
            body="Body",
            scheduled_time=timezone.now() + timedelta(hours=1),
        )

        self.assertIn("Bio 101", str(self.classroom))
        self.assertIn("student", str(self.profile))
        self.assertIn("Bio 101", str(assignment))
        self.assertIn("Pre", str(quiz))
        self.assertIn("Subject", str(scheduled))


class CsvSafetyTests(APITestCase):
    def test_csv_safe_leaves_normal_values_alone(self):
        self.assertEqual(csv_safe("Alice"), "Alice")
        self.assertEqual(csv_safe(42), "42")
        self.assertEqual(csv_safe(None), "")

    def test_csv_safe_escapes_formula_prefixes(self):
        for value in ["=1+1", "+SUM(A1:A2)", "-10", "@cmd", "\t=tab", "\r=return"]:
            with self.subTest(value=value):
                self.assertEqual(csv_safe(value), f"'{value}")


@override_settings(SCHEDULED_MESSAGE_SWEEP=True)
class ScheduledMessageSweepModeTests(TeacherAPITestCase):
    """Delivery without a Celery worker.

    On a platform with no worker process there is nothing to hold a task with a
    future eta, so the row itself is the schedule and a periodic sweep delivers
    what has come due.
    """

    def test_create_does_not_enqueue_when_the_sweep_owns_delivery(self):
        self.as_teacher()

        with patch("classroom_admin.api_views.schedule_message_task.apply_async") as apply_async:
            response = self.client.post(
                reverse("teacher-schedule-messages", args=[self.classroom.id]),
                {
                    "subject": "Later",
                    "body": "Bring notebooks",
                    "scheduled_time": (timezone.now() + timedelta(hours=1)).isoformat(),
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        # Enqueuing here would deliver immediately: eager mode ignores the eta.
        apply_async.assert_not_called()
        self.assertTrue(ScheduledMessage.objects.filter(subject="Later", sent=False).exists())


class SendDueMessagesCommandTests(TeacherAPITestCase):
    def _message(self, subject, offset):
        return ScheduledMessage.objects.create(
            classroom=self.classroom,
            subject=subject,
            body="Body",
            scheduled_time=timezone.now() + offset,
        )

    def test_sends_a_message_whose_time_has_passed(self):
        msg = self._message("Due", timedelta(minutes=-1))

        out = StringIO()
        call_command("send_due_messages", stdout=out)

        msg.refresh_from_db()
        self.assertTrue(msg.sent)
        self.assertIsNotNone(msg.sent_at)
        self.assertTrue(
            Message.objects.filter(recipient=self.student, subject="Due").exists()
        )

    def test_leaves_a_message_scheduled_for_the_future_alone(self):
        msg = self._message("Future", timedelta(hours=1))

        call_command("send_due_messages", stdout=StringIO())

        msg.refresh_from_db()
        self.assertFalse(msg.sent)
        self.assertFalse(Message.objects.filter(subject="Future").exists())

    def test_does_not_resend_on_a_second_run(self):
        self._message("Once", timedelta(minutes=-1))

        call_command("send_due_messages", stdout=StringIO())
        first = Message.objects.filter(subject="Once").count()
        call_command("send_due_messages", stdout=StringIO())

        self.assertEqual(Message.objects.filter(subject="Once").count(), first)

    def test_one_failing_message_does_not_block_the_rest(self):
        self._message("Broken", timedelta(minutes=-2))
        self._message("Fine", timedelta(minutes=-1))

        real = ScheduledMessage.objects.get

        def explode_on_broken(*args, **kwargs):
            found = real(*args, **kwargs)
            if found.subject == "Broken":
                raise RuntimeError("boom")
            return found

        with patch("classroom_admin.tasks.ScheduledMessage.objects.get", explode_on_broken):
            call_command("send_due_messages", stdout=StringIO())

        self.assertTrue(Message.objects.filter(subject="Fine").exists())
        self.assertFalse(ScheduledMessage.objects.get(subject="Broken").sent)
