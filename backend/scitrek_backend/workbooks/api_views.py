from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Workbook, Section, Question, StudentAnswer
from .serializers import (
    WorkbookSerializer,
    SectionSerializer,
    QuestionSerializer,
    StudentAnswerSerializer,
)
from .tasks import parse_workbook_task

class WorkbookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Workbooks. Injects `include_toc` into serializer context
    so that first 8 TOC sections can be excluded by default.
    """
    queryset         = Workbook.objects.all().order_by('id')
    serializer_class = WorkbookSerializer
    parser_classes   = [MultiPartParser, FormParser]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['include_toc'] = self.request.query_params.get('include_toc') == 'true'
        return ctx

    def perform_create(self, serializer):
        wb = serializer.save()
        parse_workbook_task.delay(wb.id)

    def perform_update(self, serializer):
        wb = serializer.save()
        if 'file' in self.request.data:
            parse_workbook_task.delay(wb.id)

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


class SectionViewSet(viewsets.ModelViewSet):
    queryset         = Section.objects.all().order_by('workbook', 'order')
    serializer_class = SectionSerializer


class QuestionViewSet(viewsets.ModelViewSet):
    queryset         = Question.objects.all().order_by('workbook', 'order')
    serializer_class = QuestionSerializer


class StudentAnswerViewSet(viewsets.ModelViewSet):
    queryset         = StudentAnswer.objects.all()
    serializer_class = StudentAnswerSerializer
    parser_classes   = [FormParser, MultiPartParser]
