from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from kombu.exceptions import OperationalError

from .models import Workbook, Section, SectionImage, Question, StudentAnswer
from .serializers import (
    WorkbookSerializer,
    SectionSerializer,
    QuestionSerializer,
    StudentAnswerSerializer,
)
from .tasks import parse_workbook_task
from scitrek_backend.private_files import private_file_response


class IsCurriculumAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True

        model = view.content_model
        action = {
            'POST': 'add',
            'PUT': 'change',
            'PATCH': 'change',
            'DELETE': 'delete',
        }.get(request.method)
        if action is None:
            return False
        return request.user.has_perm(
            f'{model._meta.app_label}.{action}_{model._meta.model_name}'
        )


class IsSectionContentAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_staff
                or request.user.has_perm('workbooks.change_section')
            )
        )


class WorkbookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Workbooks. Injects `include_toc` into serializer context
    so that first 8 TOC sections can be excluded by default.
    """
    serializer_class = WorkbookSerializer
    parser_classes   = [MultiPartParser, FormParser]
    permission_classes = [IsCurriculumAdminOrReadOnly]
    content_model = Workbook

    def get_queryset(self):
        qs = Workbook.objects.all().order_by('id')
        user = self.request.user
        if user.is_authenticated and not (user.is_staff or getattr(user, 'is_teacher', False)):
            qs = qs.filter(role='student')
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['include_toc'] = self.request.query_params.get('include_toc') == 'true'
        return ctx

    def perform_create(self, serializer):
        wb = serializer.save()
        self._enqueue_parse_task(wb)

    def perform_update(self, serializer):
        wb = serializer.save()
        if 'file' in self.request.data:
            self._enqueue_parse_task(wb)

    def _enqueue_parse_task(self, workbook):
        if not workbook.file:
            return
        try:
            parse_workbook_task.delay(workbook.id)
        except OperationalError as exc:
            workbook.import_error = f"Unable to queue workbook import: {exc}"
            workbook.save(update_fields=['import_error'])

    @action(detail=True, methods=['get'], url_path='questions')
    def questions(self, request, pk=None):
        workbook   = self.get_object()
        qs         = Question.objects.filter(workbook=workbook).order_by('order')
        serializer = QuestionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='progress')
    def progress(self, request, pk=None):
        workbook = self.get_object()
        total    = Question.objects.filter(workbook=workbook).count()
        answered = StudentAnswer.objects.filter(
            question__workbook=workbook,
            student=request.user
        ).count()
        return Response({'total_questions': total, 'answered_count': answered})

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        workbook = self.get_object()
        return private_file_response(workbook.file)


class SectionViewSet(viewsets.ModelViewSet):
    serializer_class = SectionSerializer
    permission_classes = [IsSectionContentAdminOrReadOnly]

    def get_queryset(self):
        qs = Section.objects.all().order_by('workbook', 'order')
        user = self.request.user
        if user.is_authenticated and not (user.is_staff or getattr(user, 'is_teacher', False)):
            qs = qs.filter(workbook__role='student')
        return qs

    @action(
        detail=True,
        methods=['get'],
        url_path=r'images/(?P<image_id>[^/.]+)/download',
        url_name='image-download',
    )
    def image_download(self, request, pk=None, image_id=None):
        section = self.get_object()
        image = SectionImage.objects.filter(pk=image_id, section=section).first()
        if image is None:
            from django.http import Http404
            raise Http404
        return private_file_response(image.image, inline_image=True)


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [IsCurriculumAdminOrReadOnly]
    content_model = Question

    def get_queryset(self):
        qs = Question.objects.all().order_by('workbook', 'order')
        user = self.request.user
        if user.is_authenticated and not (user.is_staff or getattr(user, 'is_teacher', False)):
            qs = qs.filter(workbook__role='student')
        return qs


class StudentAnswerViewSet(viewsets.ModelViewSet):
    serializer_class = StudentAnswerSerializer
    parser_classes   = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        return StudentAnswer.objects.filter(student=self.request.user).order_by('question__workbook_id', 'question__order', 'id')

    def perform_create(self, serializer):
        self._validate_student_can_answer(serializer.validated_data['question'])
        if StudentAnswer.objects.filter(question=serializer.validated_data['question'], student=self.request.user).exists():
            raise ValidationError({'question': 'Answer already exists for this question.'})
        serializer.save(student=self.request.user)

    def perform_update(self, serializer):
        self._validate_student_can_answer(serializer.validated_data.get('question', serializer.instance.question))
        serializer.save(student=self.request.user)

    def _validate_student_can_answer(self, question):
        if not getattr(self.request.user, 'is_student', False):
            raise PermissionDenied('Only students can submit workbook answers.')
        if question.workbook.role != 'student':
            raise ValidationError({'question': 'Students can only answer student workbook questions.'})
