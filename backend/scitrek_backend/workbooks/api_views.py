# workbooks/api_views.py

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser

from .models import Workbook, Section, SectionImage
from .serializers import (
    WorkbookSerializer,
    WorkbookCreateSerializer,
    SectionSerializer,
    SectionCreateSerializer,
    SectionImageSerializer,
    SectionImageCreateSerializer,
)
from .tasks import parse_workbook_task


class WorkbookViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Workbook.objects.all().order_by('-uploaded_at')
    serializer_class = WorkbookSerializer

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return WorkbookCreateSerializer
        return WorkbookSerializer

    def perform_create(self, serializer):
        workbook = serializer.save()
        parse_workbook_task.delay(workbook.id)


class SectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Section.objects.all().order_by('workbook', 'order')
    parser_classes = [FormParser, MultiPartParser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SectionCreateSerializer
        return SectionSerializer


class SectionImageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SectionImage.objects.all().order_by('section', 'order')
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SectionImageCreateSerializer
        return SectionImageSerializer
