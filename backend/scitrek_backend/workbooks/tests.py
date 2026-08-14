from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from unittest.mock import MagicMock, patch
from kombu.exceptions import OperationalError
import shutil
import tempfile

from classroom_admin.models import CustomUser
from .models import Workbook, Section, SectionImage, Question, StudentAnswer
from .tasks import parse_workbook_task


class TemporaryMediaRootMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media_root = tempfile.mkdtemp()
        cls._media_override = override_settings(MEDIA_ROOT=cls._media_root)
        cls._media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._media_override.disable()
        shutil.rmtree(cls._media_root, ignore_errors=True)
        super().tearDownClass()


class WorkbookAPIPermissionTests(TemporaryMediaRootMixin, APITestCase):
    def setUp(self):
        self.teacher = CustomUser.objects.create_user(
            username='teacher',
            password='pass',
            is_teacher=True,
        )
        self.content_admin = CustomUser.objects.create_user(
            username='content-admin',
            password='pass',
            is_staff=True,
        )
        self.student = CustomUser.objects.create_user(
            username='student',
            password='pass',
            is_student=True,
        )
        self.other_student = CustomUser.objects.create_user(
            username='other-student',
            password='pass',
            is_student=True,
        )
        self.workbook = Workbook.objects.create(
            role='student',
            title='Student Workbook',
            description='Demo workbook',
        )
        self.teacher_workbook = Workbook.objects.create(
            role='teacher',
            title='Teacher Workbook',
            description='Teacher-only workbook',
        )
        self.question = Question.objects.create(
            workbook=self.workbook,
            order=1,
            prompt='What did you learn?',
        )
        self.teacher_question = Question.objects.create(
            workbook=self.teacher_workbook,
            order=1,
            prompt='Teacher prompt',
        )

    def test_student_can_read_but_not_create_workbooks(self):
        self.client.force_authenticate(self.student)

        list_resp = self.client.get(reverse('workbook-list'))
        create_resp = self.client.post(reverse('workbook-list'), {
            'role': 'student',
            'title': 'Injected Workbook',
        })

        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(create_resp.status_code, 403)

    def test_anonymous_user_cannot_read_workbooks(self):
        resp = self.client.get(reverse('workbook-list'))

        self.assertEqual(resp.status_code, 401)

    def test_student_only_sees_student_workbooks(self):
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('workbook-list'))

        self.assertEqual(resp.status_code, 200)
        titles = [item['title'] for item in resp.data['results']]
        self.assertIn('Student Workbook', titles)
        self.assertNotIn('Teacher Workbook', titles)

    def test_student_cannot_fetch_teacher_workbook_detail(self):
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('workbook-detail', args=[self.teacher_workbook.id]))

        self.assertEqual(resp.status_code, 404)

    def test_teacher_can_read_teacher_workbook_detail(self):
        self.client.force_authenticate(self.teacher)

        resp = self.client.get(reverse('workbook-detail', args=[self.teacher_workbook.id]))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], 'Teacher Workbook')

    def test_authenticated_student_can_download_student_workbook_privately(self):
        self.workbook.file.save(
            'student.pdf',
            SimpleUploadedFile('student.pdf', b'%PDF-1.4\n%%EOF', content_type='application/pdf'),
        )
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('workbook-download', args=[self.workbook.id]))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Cache-Control'], 'private, no-store')
        self.assertEqual(resp['X-Content-Type-Options'], 'nosniff')
        self.assertIn('attachment', resp['Content-Disposition'])

    def test_student_cannot_download_teacher_workbook_file(self):
        self.teacher_workbook.file.save(
            'teacher.pdf',
            SimpleUploadedFile('teacher.pdf', b'%PDF-1.4\n%%EOF', content_type='application/pdf'),
        )
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('workbook-download', args=[self.teacher_workbook.id]))

        self.assertEqual(resp.status_code, 404)

    def test_section_image_uses_authorized_inline_download(self):
        section = Section.objects.create(
            workbook=self.workbook,
            heading='Image section',
            order=9,
            content_html='<p>Image</p>',
        )
        image = SectionImage.objects.create(
            section=section,
            image=SimpleUploadedFile('figure.png', b'\x89PNG\r\n\x1a\n', content_type='image/png'),
            caption='Figure',
        )
        self.client.force_authenticate(self.student)

        detail = self.client.get(reverse('workbook-detail', args=[self.workbook.id]))
        download = self.client.get(
            reverse('section-image-download', args=[section.id, image.id])
        )

        self.assertTrue(detail.data['sections'][0]['images'][0]['image'].endswith(reverse(
            'section-image-download', args=[section.id, image.id]
        )))
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download['Content-Type'], 'image/png')
        self.assertEqual(download['Cache-Control'], 'private, no-store')

    def test_nonstaff_teacher_cannot_create_workbook(self):
        self.client.force_authenticate(self.teacher)

        with patch('workbooks.api_views.parse_workbook_task.delay') as delay:
            resp = self.client.post(reverse('workbook-list'), {
                'role': 'student',
                'title': 'Teacher Created Workbook',
                'description': '',
            })

        self.assertEqual(resp.status_code, 403)
        delay.assert_not_called()

    def test_staff_content_admin_can_create_workbook(self):
        self.client.force_authenticate(self.content_admin)

        resp = self.client.post(reverse('workbook-list'), {
            'role': 'student',
            'title': 'Staff Created Workbook',
            'description': '',
        })

        self.assertEqual(resp.status_code, 201)

    def test_nonstaff_teacher_cannot_modify_or_delete_global_curriculum(self):
        answer = StudentAnswer.objects.create(
            question=self.question,
            student=self.student,
            answer='Retain this answer',
        )
        self.client.force_authenticate(self.teacher)

        workbook_patch = self.client.patch(
            reverse('workbook-detail', args=[self.workbook.id]),
            {'title': 'Compromised'},
        )
        workbook_delete = self.client.delete(reverse('workbook-detail', args=[self.workbook.id]))
        question_delete = self.client.delete(reverse('question-detail', args=[self.question.id]))

        self.assertEqual(workbook_patch.status_code, 403)
        self.assertEqual(workbook_delete.status_code, 403)
        self.assertEqual(question_delete.status_code, 403)
        self.assertTrue(Workbook.objects.filter(pk=self.workbook.pk).exists())
        self.assertTrue(Question.objects.filter(pk=self.question.pk).exists())
        self.assertTrue(StudentAnswer.objects.filter(pk=answer.pk).exists())

    def test_student_cannot_update_or_delete_workbook(self):
        self.client.force_authenticate(self.student)

        patch_resp = self.client.patch(reverse('workbook-detail', args=[self.workbook.id]), {'title': 'Hack'})
        delete_resp = self.client.delete(reverse('workbook-detail', args=[self.workbook.id]))

        self.assertEqual(patch_resp.status_code, 403)
        self.assertEqual(delete_resp.status_code, 403)
        self.workbook.refresh_from_db()
        self.assertEqual(self.workbook.title, 'Student Workbook')

    def test_teacher_create_with_file_records_queue_failure(self):
        self.client.force_authenticate(self.content_admin)
        upload = SimpleUploadedFile('workbook.pdf', b'%PDF-1.4\n%%EOF', content_type='application/pdf')

        with patch('workbooks.api_views.parse_workbook_task.delay', side_effect=OperationalError('redis down')):
            resp = self.client.post(
                reverse('workbook-list'),
                {
                    'role': 'student',
                    'title': 'Queued Workbook',
                    'description': '',
                    'file': upload,
                },
                format='multipart',
            )

        self.assertEqual(resp.status_code, 201)
        workbook = Workbook.objects.get(title='Queued Workbook')
        self.assertIn('Unable to queue workbook import', workbook.import_error)

    def test_teacher_upload_rejects_non_pdf_extension(self):
        self.client.force_authenticate(self.content_admin)
        upload = SimpleUploadedFile('workbook.txt', b'%PDF-1.4\n%%EOF', content_type='application/pdf')

        resp = self.client.post(
            reverse('workbook-list'),
            {'role': 'student', 'title': 'Bad Extension', 'file': upload},
            format='multipart',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('file', resp.data)
        self.assertFalse(Workbook.objects.filter(title='Bad Extension').exists())

    def test_teacher_upload_rejects_wrong_mime_type(self):
        self.client.force_authenticate(self.content_admin)
        upload = SimpleUploadedFile('workbook.pdf', b'%PDF-1.4\n%%EOF', content_type='text/plain')

        resp = self.client.post(
            reverse('workbook-list'),
            {'role': 'student', 'title': 'Bad Mime', 'file': upload},
            format='multipart',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('application/pdf', str(resp.data['file']))

    def test_teacher_upload_rejects_empty_pdf(self):
        self.client.force_authenticate(self.content_admin)
        upload = SimpleUploadedFile('workbook.pdf', b'', content_type='application/pdf')

        resp = self.client.post(
            reverse('workbook-list'),
            {'role': 'student', 'title': 'Empty PDF', 'file': upload},
            format='multipart',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('empty', str(resp.data['file']).lower())

    def test_teacher_upload_rejects_misleading_pdf_extension(self):
        self.client.force_authenticate(self.content_admin)
        upload = SimpleUploadedFile('workbook.pdf', b'not a pdf', content_type='application/pdf')

        resp = self.client.post(
            reverse('workbook-list'),
            {'role': 'student', 'title': 'Fake PDF', 'file': upload},
            format='multipart',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('valid PDF', str(resp.data['file']))

    def test_teacher_upload_rejects_huge_pdf(self):
        self.client.force_authenticate(self.content_admin)
        upload = SimpleUploadedFile(
            'workbook.pdf',
            b'%PDF-' + (b'x' * (10 * 1024 * 1024)),
            content_type='application/pdf',
        )

        resp = self.client.post(
            reverse('workbook-list'),
            {'role': 'student', 'title': 'Huge PDF', 'file': upload},
            format='multipart',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertIn('10 MB', str(resp.data['file']))

    def test_import_status_reports_failed_when_import_error_exists(self):
        workbook = Workbook.objects.create(
            role='student',
            title='Failed Import',
            import_started=timezone.now(),
            import_finished=timezone.now(),
            import_error='No recognized headings',
        )
        self.client.force_authenticate(self.teacher)

        resp = self.client.get(reverse('workbook-detail', args=[workbook.id]))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['import_status'], 'failed')

    def test_workbook_questions_action_lists_questions_in_order(self):
        Question.objects.create(workbook=self.workbook, order=2, prompt='Second')
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('workbook-questions', args=[self.workbook.id]))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual([item['order'] for item in resp.data], [1, 2])

    def test_workbook_progress_counts_only_current_student_answers(self):
        StudentAnswer.objects.create(question=self.question, student=self.student, answer='Mine')
        StudentAnswer.objects.create(question=self.question, student=self.other_student, answer='Other')
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('workbook-progress', args=[self.workbook.id]))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, {'total_questions': 1, 'answered_count': 1})

    def test_default_workbook_detail_excludes_table_of_contents_sections(self):
        Section.objects.create(workbook=self.workbook, heading='TOC', order=1, content_html='toc')
        Section.objects.create(workbook=self.workbook, heading='Day 1', order=9, content_html='body')
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('workbook-detail', args=[self.workbook.id]))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual([section['heading'] for section in resp.data['sections']], ['Day 1'])

    def test_include_toc_query_includes_early_sections(self):
        Section.objects.create(workbook=self.workbook, heading='TOC', order=1, content_html='toc')
        Section.objects.create(workbook=self.workbook, heading='Day 1', order=9, content_html='body')
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('workbook-detail', args=[self.workbook.id]), {'include_toc': 'true'})

        self.assertEqual(resp.status_code, 200)
        self.assertEqual([section['heading'] for section in resp.data['sections']], ['TOC', 'Day 1'])

    def test_student_answers_are_scoped_to_current_user(self):
        own_answer = StudentAnswer.objects.create(
            question=self.question,
            student=self.student,
            answer='Mine',
        )
        StudentAnswer.objects.create(
            question=self.question,
            student=self.other_student,
            answer='Someone else',
        )
        self.client.force_authenticate(self.student)

        list_resp = self.client.get(reverse('answer-list'))
        detail_resp = self.client.get(reverse('answer-detail', args=[own_answer.id]))

        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(list_resp.data['results']), 1)
        self.assertEqual(list_resp.data['results'][0]['answer'], 'Mine')
        self.assertEqual(detail_resp.status_code, 200)

    def test_student_can_create_answer_with_json_body(self):
        self.client.force_authenticate(self.student)

        resp = self.client.post(
            reverse('answer-list'),
            {'question': self.question.id, 'answer': 'JSON answer'},
            format='json',
        )

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(StudentAnswer.objects.get(student=self.student, question=self.question).answer, 'JSON answer')

    def test_student_duplicate_answer_post_returns_400(self):
        StudentAnswer.objects.create(question=self.question, student=self.student, answer='First')
        self.client.force_authenticate(self.student)

        resp = self.client.post(
            reverse('answer-list'),
            {'question': self.question.id, 'answer': 'Second'},
            format='json',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(StudentAnswer.objects.get(student=self.student, question=self.question).answer, 'First')

    def test_student_can_update_own_answer(self):
        answer = StudentAnswer.objects.create(question=self.question, student=self.student, answer='First')
        self.client.force_authenticate(self.student)

        resp = self.client.patch(reverse('answer-detail', args=[answer.id]), {'answer': 'Updated'}, format='json')

        self.assertEqual(resp.status_code, 200)
        answer.refresh_from_db()
        self.assertEqual(answer.answer, 'Updated')

    def test_teacher_cannot_submit_student_answer(self):
        self.client.force_authenticate(self.teacher)

        resp = self.client.post(
            reverse('answer-list'),
            {'question': self.question.id, 'answer': 'Teacher answer'},
            format='json',
        )

        self.assertEqual(resp.status_code, 403)
        self.assertFalse(StudentAnswer.objects.filter(answer='Teacher answer').exists())

    def test_student_cannot_answer_teacher_workbook_question(self):
        self.client.force_authenticate(self.student)

        resp = self.client.post(
            reverse('answer-list'),
            {'question': self.teacher_question.id, 'answer': 'Nope'},
            format='json',
        )

        self.assertEqual(resp.status_code, 400)
        self.assertFalse(StudentAnswer.objects.filter(question=self.teacher_question, student=self.student).exists())

    def test_student_cannot_read_another_students_answer_detail(self):
        other_answer = StudentAnswer.objects.create(
            question=self.question,
            student=self.other_student,
            answer='Someone else',
        )
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('answer-detail', args=[other_answer.id]))

        self.assertEqual(resp.status_code, 404)

    def test_student_cannot_list_teacher_workbook_sections(self):
        section = Section.objects.create(
            workbook=self.teacher_workbook,
            heading='Teacher Only',
            order=1,
            content_html='<p>Hidden</p>',
        )
        self.client.force_authenticate(self.student)

        list_resp = self.client.get(reverse('section-list'))
        detail_resp = self.client.get(reverse('section-detail', args=[section.id]))

        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(list_resp.data['results']), 0)
        self.assertEqual(detail_resp.status_code, 404)

    def test_non_staff_teacher_cannot_modify_shared_section_html(self):
        section = Section.objects.create(
            workbook=self.workbook,
            heading='Student content',
            order=1,
            content_html='<p>Safe</p>',
        )
        self.client.force_authenticate(self.teacher)

        resp = self.client.patch(
            reverse('section-detail', args=[section.id]),
            {'content_html': '<script>alert(1)</script><p>Changed</p>'},
            format='json',
        )

        self.assertEqual(resp.status_code, 403)
        section.refresh_from_db()
        self.assertEqual(section.content_html, '<p>Safe</p>')

    def test_staff_content_update_is_sanitized_before_persistence(self):
        section = Section.objects.create(
            workbook=self.workbook,
            heading='Student content',
            order=1,
            content_html='<p>Safe</p>',
        )
        self.client.force_authenticate(self.content_admin)

        resp = self.client.patch(
            reverse('section-detail', args=[section.id]),
            {
                'content_html': (
                    '<script>alert(1)</script>'
                    '<p onclick="steal()"><strong>Lesson</strong>'
                    '<a href="javascript:steal()">link</a></p>'
                )
            },
            format='json',
        )

        self.assertEqual(resp.status_code, 200)
        section.refresh_from_db()
        self.assertNotIn('<script', section.content_html)
        self.assertNotIn('onclick', section.content_html)
        self.assertNotIn('javascript:', section.content_html)
        self.assertIn('<strong>Lesson</strong>', section.content_html)

    def test_read_serialization_sanitizes_legacy_section_html(self):
        section = Section.objects.create(
            workbook=self.workbook,
            heading='Legacy content',
            order=1,
            content_html='<img src=x onerror=steal()><p>Visible</p><script>steal()</script>',
        )
        self.client.force_authenticate(self.student)

        resp = self.client.get(reverse('section-detail', args=[section.id]))

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['content_html'], '<p>Visible</p>')

    def test_student_cannot_list_teacher_workbook_questions(self):
        self.client.force_authenticate(self.student)

        list_resp = self.client.get(reverse('question-list'))
        detail_resp = self.client.get(reverse('question-detail', args=[self.teacher_question.id]))

        self.assertEqual(list_resp.status_code, 200)
        prompts = [item['prompt'] for item in list_resp.data['results']]
        self.assertNotIn('Teacher prompt', prompts)
        self.assertEqual(detail_resp.status_code, 404)


class WorkbookParserTaskTests(TemporaryMediaRootMixin, TestCase):
    HEADINGS = [
        'Welcome to SciTrek!',
        'What You’ll Learn in the Glucose Sensing Module',
        'Important Vocabulary',
        'Day 1:Unlocking the Code: How Your Cells Decide What to Do',
        'Day 2: Understanding Cancer',
        'Day 3: Seeing Static: Gene Signals & Cancer Detection',
        'Day 4: Levels of Expression, Diagnosis, & Treatment',
        'Day 5: Poster Perfect: Showcasing Your Scientific Journey!',
    ]

    def make_workbook(self):
        return Workbook.objects.create(
            role='student',
            title='Parser Workbook',
            description='Parser fixture',
            file='workbooks/pdfs/parser.pdf',
        )

    def mock_pdf_text(self, mock_open, text):
        page = MagicMock()
        page.extract_text.return_value = text
        pdf = MagicMock()
        pdf.pages = [page]
        mock_open.return_value.__enter__.return_value = pdf

    def test_valid_pdf_text_creates_ordered_escaped_sections(self):
        workbook = self.make_workbook()
        text = "\n".join(
            f"{heading}\nBody for {idx} <script>alert('x')</script>"
            for idx, heading in enumerate(self.HEADINGS, start=1)
        )

        with patch('workbooks.tasks.pdfplumber.open') as mock_open:
            self.mock_pdf_text(mock_open, text)
            parse_workbook_task(workbook.id)

        workbook.refresh_from_db()
        sections = list(workbook.sections.all())
        self.assertEqual(len(sections), 8)
        self.assertEqual([section.order for section in sections], list(range(1, 9)))
        self.assertEqual(sections[0].heading, 'Welcome to SciTrek!')
        self.assertIn('&lt;script&gt;', sections[0].content_html)
        self.assertNotIn('<script>', sections[0].content_html)
        self.assertEqual(workbook.import_error, '')
        self.assertIsNotNone(workbook.import_started)
        self.assertIsNotNone(workbook.import_finished)

    def test_blank_pdf_records_error_and_creates_no_sections(self):
        workbook = self.make_workbook()

        with patch('workbooks.tasks.pdfplumber.open') as mock_open:
            self.mock_pdf_text(mock_open, '')
            with self.assertRaises(ValueError):
                parse_workbook_task(workbook.id)

        workbook.refresh_from_db()
        self.assertIn('No recognized workbook section headings', workbook.import_error)
        self.assertEqual(workbook.sections.count(), 0)
        self.assertIsNotNone(workbook.import_started)
        self.assertIsNotNone(workbook.import_finished)

    def test_missing_some_sections_imports_partial_valid_content(self):
        workbook = self.make_workbook()
        text = "\n".join([
            'Welcome to SciTrek!\nIntro body',
            'Day 2: Understanding Cancer\nCancer body',
            'Day 5: Poster Perfect: Showcasing Your Scientific Journey!\nPoster body',
        ])

        with patch('workbooks.tasks.pdfplumber.open') as mock_open:
            self.mock_pdf_text(mock_open, text)
            parse_workbook_task(workbook.id)

        headings = list(workbook.sections.values_list('heading', flat=True))
        self.assertEqual(headings, [
            'Welcome to SciTrek!',
            'Day 2: Understanding Cancer',
            'Day 5: Poster Perfect: Showcasing Your Scientific Journey!',
        ])

    def test_repeated_heading_is_preserved_as_a_separate_section(self):
        workbook = self.make_workbook()
        text = "\n".join([
            'Welcome to SciTrek!\nFirst intro',
            'Welcome to SciTrek!\nSecond intro',
            'Important Vocabulary\nVocabulary body',
        ])

        with patch('workbooks.tasks.pdfplumber.open') as mock_open:
            self.mock_pdf_text(mock_open, text)
            parse_workbook_task(workbook.id)

        sections = list(workbook.sections.all())
        self.assertEqual(len(sections), 3)
        self.assertEqual([section.heading for section in sections], [
            'Welcome to SciTrek!',
            'Welcome to SciTrek!',
            'Important Vocabulary',
        ])
        self.assertIn('Second intro', sections[1].content_html)

    def test_unexpected_heading_order_preserves_pdf_order(self):
        workbook = self.make_workbook()
        text = "\n".join([
            'Day 3: Seeing Static: Gene Signals & Cancer Detection\nDay three body',
            'Welcome to SciTrek!\nIntro body',
        ])

        with patch('workbooks.tasks.pdfplumber.open') as mock_open:
            self.mock_pdf_text(mock_open, text)
            parse_workbook_task(workbook.id)

        self.assertEqual(
            list(workbook.sections.values_list('heading', flat=True)),
            ['Day 3: Seeing Static: Gene Signals & Cancer Detection', 'Welcome to SciTrek!'],
        )

    def test_parser_exception_records_error_and_preserves_existing_sections(self):
        workbook = self.make_workbook()
        existing = Section.objects.create(
            workbook=workbook,
            heading='Existing',
            order=1,
            content_html='Keep me',
        )

        with patch('workbooks.tasks.pdfplumber.open', side_effect=FileNotFoundError('missing.pdf')):
            with self.assertRaises(FileNotFoundError):
                parse_workbook_task(workbook.id)

        workbook.refresh_from_db()
        self.assertIn('missing.pdf', workbook.import_error)
        self.assertTrue(Section.objects.filter(id=existing.id, content_html='Keep me').exists())

    def test_section_replacement_failure_rolls_back_to_last_known_good_content(self):
        workbook = self.make_workbook()
        existing = Section.objects.create(
            workbook=workbook,
            heading='Existing',
            order=1,
            content_html='Keep me',
        )
        text = 'Welcome to SciTrek!\nReplacement body'

        with patch('workbooks.tasks.pdfplumber.open') as mock_open:
            self.mock_pdf_text(mock_open, text)
            with patch(
                'workbooks.tasks.Section.objects.bulk_create',
                side_effect=RuntimeError('database write failed'),
            ), self.assertRaises(RuntimeError):
                parse_workbook_task(workbook.id)

        workbook.refresh_from_db()
        self.assertIn('database write failed', workbook.import_error)
        self.assertTrue(Section.objects.filter(pk=existing.pk, content_html='Keep me').exists())
        self.assertEqual(workbook.sections.count(), 1)
