# scitrek_backend/urls.py
from django.contrib import admin
from django.urls import path, include 
from django.conf import settings
from student_activities.auth_views import MyTokenObtainPairView, ScopedTokenRefreshView
from .health import liveness, readiness
if settings.DEBUG:
    from drf_yasg.views import get_schema_view
    from drf_yasg import openapi
    from rest_framework import permissions

    schema_view = get_schema_view(
        openapi.Info(
            title="SciTrek Backend API",
            default_version='v1',
            description="API documentation for the SciTrek project",
        ),
        public=True,
        permission_classes=(permissions.AllowAny,),
    )

urlpatterns = [
    path('healthz/', liveness, name='healthz'),
    path('readyz/', readiness, name='readyz'),
    path('api/health/', liveness, name='api-health'),
    path('api/ready/', readiness, name='api-ready'),
    path('admin/', admin.site.urls),

    # JWT auth (custom obtain, stock refresh)
    path('api/token/',         MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', ScopedTokenRefreshView.as_view(), name='token_refresh'),

    # App endpoints
    path('api/classroom/', include('classroom_admin.api_urls')),
    path('api/student/',   include('student_activities.api_urls')),
    path('api/workbooks/', include('workbooks.api_urls')),
]

if settings.DEBUG:
    urlpatterns.insert(1, path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'))
