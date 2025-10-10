# scitrek_backend/urls.py
from django.contrib import admin
from django.urls import path, include 
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from student_activities.auth_views import MyTokenObtainPairView
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
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('admin/', admin.site.urls),

    # JWT auth (custom obtain, stock refresh)
    path('api/token/',         MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(),      name='token_refresh'),

    # App endpoints
    path('api/classroom/', include('classroom_admin.api_urls')),
    path('api/student/',   include('student_activities.api_urls')),
    path('api/workbooks/', include('workbooks.api_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
