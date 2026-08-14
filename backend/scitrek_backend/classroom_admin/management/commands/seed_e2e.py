from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from classroom_admin.models import Classroom, ModuleAssignment, QuizAssignment, Student
from student_activities.models import Message, Module, QuizAttempt, QuizQuestion, StudentResponse
from student_activities.tasks import seed_inbox_for_user_now
from workbooks.models import Question, Section, StudentAnswer, Workbook


class Command(BaseCommand):
    help = "Seed deterministic disposable E2E data with explicit safety guards."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete and recreate deterministic E2E records.",
        )

    def handle(self, *args, **options):
        reset = options["reset"]
        database_name = str(settings.DATABASES["default"].get("NAME", ""))
        reset_allowed = getattr(settings, "E2E_RESET_ALLOWED", False)
        if reset and (not reset_allowed or "e2e" not in database_name.lower()):
            raise CommandError(
                "--reset requires SCITREK_E2E_RESET_ALLOWED=1 and an E2E-named database."
            )
        if not settings.DEBUG and not reset_allowed:
            raise CommandError(
                "seed_e2e is only allowed in DEBUG mode or an explicitly enabled E2E environment."
            )

        User = get_user_model()

        with transaction.atomic():
            if reset:
                self._reset(User)

            teacher = self._user(
                User,
                username="teacher1001",
                password="teacher1001",
                email="teacher1001@example.test",
                first_name="E2E",
                last_name="Teacher",
                is_teacher=True,
                is_student=False,
                is_staff=True,
            )
            student = self._user(
                User,
                username="student1001",
                password="student1001",
                email="student1001@example.test",
                first_name="Demo",
                last_name="Student",
                is_teacher=False,
                is_student=True,
                is_staff=False,
            )
            alt_student = self._user(
                User,
                username="student_alt",
                password="student_alt",
                email="student-alt@example.test",
                first_name="Alt",
                last_name="Student",
                is_teacher=False,
                is_student=True,
                is_staff=False,
            )

            classroom, _ = Classroom.objects.update_or_create(
                name="1001",
                defaults={
                    "teacher": teacher,
                    "description": "Deterministic E2E classroom",
                },
            )

            for user, first, last in [
                (student, "Demo", "Student"),
                (alt_student, "Alt", "Student"),
            ]:
                Student.objects.update_or_create(
                    user=user,
                    defaults={
                        "classroom": classroom,
                        "first_name": first,
                        "last_name": last,
                    },
                )

            module_titles = {
                1: "Unlocking the Code",
                2: "Understanding Cancer",
                3: "Seeing Static",
                4: "Levels of Expression",
                5: "Poster Presentation",
            }
            modules = []
            for day, title in module_titles.items():
                module, _ = Module.objects.update_or_create(
                    classroom=classroom,
                    day=day,
                    defaults={
                        "title": title,
                        "content": f"E2E Day {day} content",
                    },
                )
                modules.append(module)
                ModuleAssignment.objects.update_or_create(
                    classroom=classroom,
                    module=module,
                    defaults={"release_date": timezone.now()},
                )

            for quiz_type in [QuizQuestion.PRE, QuizQuestion.POST]:
                QuizAssignment.objects.update_or_create(
                    classroom=classroom,
                    quiz_type=quiz_type,
                    defaults={"release_date": timezone.now()},
                )
                QuizQuestion.objects.update_or_create(
                    classroom=classroom,
                    quiz_type=quiz_type,
                    question_text=f"E2E {quiz_type} question",
                    defaults={
                        "choices": {"A": "Correct", "B": "Incorrect"},
                        "answer": "A",
                    },
                )

            workbook, _ = Workbook.objects.update_or_create(
                role="student",
                title="E2E Student Workbook",
                defaults={
                    "description": "Deterministic E2E workbook",
                    "file": None,
                    "import_started": timezone.now(),
                    "import_finished": timezone.now(),
                    "import_error": "",
                },
            )
            for order, heading in enumerate([
                "Welcome to SciTrek!",
                "What You’ll Learn",
                "Important Vocabulary",
                "Day 1",
                "Day 2",
                "Day 3",
                "Day 4",
                "Day 5",
                "Student Activity",
            ], start=1):
                Section.objects.update_or_create(
                    workbook=workbook,
                    order=order,
                    defaults={
                        "heading": heading,
                        "content_html": f"<p>E2E section {order}</p>",
                    },
                )

            Question.objects.update_or_create(
                workbook=workbook,
                order=1,
                defaults={
                    "prompt": "What did you learn during E2E?",
                    "input_type": Question.TEXTAREA,
                },
            )

            for e2e_student in [student, alt_student]:
                seed_inbox_for_user_now(e2e_student.id)
                Message.objects.filter(recipient=e2e_student).update(is_read=False)

        self.stdout.write(self.style.SUCCESS("E2E seed complete."))
        self.stdout.write("Teacher login: teacher1001 / teacher1001")
        self.stdout.write("Student login: student1001 / student1001")
        self.stdout.write("Alternate student login: student_alt / student_alt")
        self.stdout.write("Classroom code: 1001")

    def _user(self, User, username, password, **defaults):
        user, _ = User.objects.update_or_create(
            username=username,
            defaults={
                **defaults,
                "is_active": True,
                "date_joined": timezone.now(),
            },
        )
        user.set_password(password)
        user.save(update_fields=["password"])
        return user

    def _reset(self, User):
        e2e_users = User.objects.filter(username__in=[
            "teacher1001",
            "student1001",
            "student_alt",
            "guest_e2e",
        ])
        StudentAnswer.objects.filter(student__in=e2e_users).delete()
        StudentResponse.objects.filter(student__in=e2e_users).delete()
        QuizAttempt.objects.filter(student__in=e2e_users).delete()
        Message.objects.filter(recipient__in=e2e_users).delete()
        Classroom.objects.filter(name="1001").delete()
        Workbook.objects.filter(title="E2E Student Workbook").delete()
        e2e_users.delete()
