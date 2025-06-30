from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    WorkbookViewSet,
    SectionViewSet,
    QuestionViewSet,
    StudentAnswerViewSet,
)

router = DefaultRouter()
router.register(r'workbooks', WorkbookViewSet,      basename='workbook')
router.register(r'sections',  SectionViewSet,       basename='section')
router.register(r'questions', QuestionViewSet,      basename='question')
router.register(r'answers',   StudentAnswerViewSet, basename='answer')

urlpatterns = [
    path('', include(router.urls)),
]
