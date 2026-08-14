from django.test import TestCase

from classroom_admin.models import Classroom, CustomUser, Student
from student_activities.models import Message
from student_activities.tasks import TEMPLATES, seed_inbox_for_user_now


class InboxSeedTaskTests(TestCase):
    def setUp(self):
        self.teacher = CustomUser.objects.create_user(username="teacher", password="pw", is_teacher=True)
        self.classroom = Classroom.objects.create(name="1001", teacher=self.teacher)
        self.student = CustomUser.objects.create_user(username="student", password="pw", is_student=True)
        Student.objects.create(user=self.student, classroom=self.classroom, first_name="", last_name="")

    def test_seed_creates_virtual_scientist_user(self):
        CustomUser.objects.filter(username="virtual_scientist").delete()

        seed_inbox_for_user_now(self.student.id)

        vs = CustomUser.objects.get(username="virtual_scientist")
        self.assertFalse(vs.is_student)
        self.assertFalse(vs.is_teacher)
        self.assertTrue(vs.is_active)

    def test_seed_creates_one_message_per_template(self):
        seed_inbox_for_user_now(self.student.id)

        self.assertEqual(Message.objects.filter(recipient=self.student).count(), len(TEMPLATES))

    def test_seed_is_idempotent(self):
        seed_inbox_for_user_now(self.student.id)
        seed_inbox_for_user_now(self.student.id)

        self.assertEqual(Message.objects.filter(recipient=self.student).count(), len(TEMPLATES))

    def test_seed_updates_existing_template_body(self):
        seed_inbox_for_user_now(self.student.id)
        message = Message.objects.get(recipient=self.student, subject=TEMPLATES[0][0])
        message.body = "old"
        message.save(update_fields=["body"])

        result = seed_inbox_for_user_now(self.student.id)

        message.refresh_from_db()
        self.assertEqual(message.body, TEMPLATES[0][1])
        self.assertEqual(result["updated"], 1)

    def test_seed_fills_missing_templates_without_replacing_existing_message(self):
        vs = CustomUser.objects.get(username="virtual_scientist")
        existing = Message.objects.get(sender=vs, recipient=self.student, subject=TEMPLATES[0][0])
        Message.objects.filter(recipient=self.student).exclude(id=existing.id).delete()

        result = seed_inbox_for_user_now(self.student.id)

        self.assertTrue(Message.objects.filter(id=existing.id).exists())
        self.assertEqual(Message.objects.filter(recipient=self.student).count(), len(TEMPLATES))
        self.assertEqual(result["created"], len(TEMPLATES) - 1)

    def test_seed_rejects_non_student_user(self):
        teacher = CustomUser.objects.create_user(username="teacher2", password="pw", is_teacher=True)

        with self.assertRaises(CustomUser.DoesNotExist):
            seed_inbox_for_user_now(teacher.id)

    def test_seed_rejects_inactive_student(self):
        self.student.is_active = False
        self.student.save(update_fields=["is_active"])

        with self.assertRaises(CustomUser.DoesNotExist):
            seed_inbox_for_user_now(self.student.id)
