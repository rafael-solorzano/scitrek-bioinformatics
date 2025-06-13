### workbooks/api_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import WorkbookViewSet, SectionViewSet, SectionImageViewSet

router = DefaultRouter()
router.register(r'workbooks', WorkbookViewSet, basename='workbook')
router.register(r'sections', SectionViewSet, basename='section')
router.register(r'section-images', SectionImageViewSet, basename='sectionimage')

urlpatterns = [
    path('', include(router.urls)),
]