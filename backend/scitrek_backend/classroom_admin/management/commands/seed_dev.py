from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from classroom_admin.models import Classroom, Student

try:
    from student_activities.models import Module
except Exception:
    Module = None

try:
    from workbooks.models import Workbook, Section
except Exception:
    Workbook = None
    Section = None


class Command(BaseCommand):
    help = "Seed a dev environment (teacher, classroom code 1001, demo content)."

    def handle(self, *args, **options):
        User = get_user_model()

        teacher_username = "teacher1001"
        teacher_email = "teacher1001@example.com"
        teacher_password = "teacher1001"

        teacher, created = User.objects.get_or_create(
            username=teacher_username,
            defaults={
                "email": teacher_email,
                "is_teacher": True,
                "is_student": False,
                "is_staff": True,
                "is_active": True,
                "date_joined": timezone.now(),
            },
        )
        if created:
            teacher.set_password(teacher_password)
            teacher.save()
            self.stdout.write(self.style.SUCCESS(f"Created teacher user {teacher_username}"))
        else:
            changed = False
            if not teacher.is_teacher:
                teacher.is_teacher = True
                changed = True
            if not teacher.is_staff:
                teacher.is_staff = True
                changed = True
            if not teacher.is_active:
                teacher.is_active = True
                changed = True
            if changed:
                teacher.save(update_fields=["is_teacher", "is_staff", "is_active"])
            self.stdout.write(self.style.WARNING(f"Teacher user {teacher_username} already exists"))

        classroom, c_created = Classroom.objects.get_or_create(
            name="1001",
            defaults={
                "teacher": teacher,
                "description": "Intro class (dev seed)",
            },
        )
        if not c_created and classroom.teacher_id != teacher.id:
            classroom.teacher = teacher
            classroom.save(update_fields=["teacher"])
        self.stdout.write(self.style.SUCCESS(f"Classroom ready: {classroom.name}"))

        student_username = "student1001"
        student_email = "student1001@example.com"
        student_password = "student1001"

        student_user, s_created = User.objects.get_or_create(
            username=student_username,
            defaults={
                "email": student_email,
                "is_teacher": False,
                "is_student": True,
                "is_staff": False,
                "is_active": True,
                "date_joined": timezone.now(),
            },
        )
        if s_created:
            student_user.set_password(student_password)
            student_user.save()
            self.stdout.write(self.style.SUCCESS(f"Created student user {student_username}"))
        else:
            changed = False
            if not student_user.is_student:
                student_user.is_student = True
                changed = True
            if student_user.is_staff:
                student_user.is_staff = False
                changed = True
            if not student_user.is_active:
                student_user.is_active = True
                changed = True
            if changed:
                student_user.save(update_fields=["is_student", "is_staff", "is_active"])
            self.stdout.write(self.style.WARNING(f"Student user {student_username} already exists"))

        Student.objects.get_or_create(
            user=student_user,
            defaults={
                "classroom": classroom,
                "first_name": "Demo",
                "last_name": "Student",
            },
        )

        if Module:
            module_defaults = [
                (1, "Unlocking the Code of Life", "Objective Today: Learn how DNA acts as instructions for life."),
                (2, "Investigating Cancer", "Objective Today: Explore how cells can lose control and form tumors."),
                (3, "From Data to Diagnosis", "Objective Today: Understand how gene expression data helps detect cancer."),
                (4, "Visualizing Gene Expression", "Objective Today: Use data visualization to find patterns."),
                (5, "Telling the Gene Story", "Objective Today: Summarize findings in a scientific poster format."),
            ]
            for day, title, content in module_defaults:
                Module.objects.get_or_create(
                    classroom_id=classroom.id,
                    day=day,
                    defaults={"title": title, "content": content},
                )
            self.stdout.write(self.style.SUCCESS("Seeded Modules (days 1–5)."))

        if Workbook and Section:
            workbook, w_created = Workbook.objects.get_or_create(
                role="student",
                title="Demo Workbook",
                defaults={
                    "description": "Dev seed workbook",
                    "file": None,
                    "uploaded_at": timezone.now(),
                    "import_started": timezone.now(),
                    "import_finished": timezone.now(),
                    "import_error": "",
                },
            )

            if not w_created:
                changed = False
                if workbook.import_error is None:
                    workbook.import_error = ""
                    changed = True
                if workbook.uploaded_at is None:
                    workbook.uploaded_at = timezone.now()
                    changed = True
                if changed:
                    workbook.save()

            sections = [
                (1, "Welcome to SciTrek!", "<p>Hey there! Welcome to SciTrek!</p>"),
                (2, "What You’ll Learn", "<p>In this module, ...</p>"),
                (3, "Important Vocabulary", "<p>Gene Expression...</p>"),
                (4, "Day 1", "<p>Unlocking the C...</p>"),
                (5, "Day 2", "<p>Objective<br>To...</p>"),
                (6, "Day 3", "<p>Objective<br>To...</p>"),
                (7, "Day 4", "<p>Gene Expression...</p>"),
                (8, "Day 5", "<p>Telling the Story...</p>"),
            ]

            for order, heading, html in sections:
                Section.objects.get_or_create(
                    workbook=workbook,
                    order=order,
                    defaults={"heading": heading, "content_html": html},
                )
            self.stdout.write(self.style.SUCCESS("Seeded Demo Workbook + Sections."))

        self.stdout.write(self.style.SUCCESS("Dev seed complete."))
        self.stdout.write("Teacher login: teacher1001 / teacher1001")
        self.stdout.write("Student login: student1001 / student1001")
        self.stdout.write("Classroom code: 1001")
