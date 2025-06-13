# student_activities/api_urls.py

from django.urls import path
from .api_views import (
    CustomStudentSignupAPIView,
    StudentProfileUpdateAPIView,
    ModuleListAPIView,
    ModuleDetailAPIView,
    ResponseUpsert,
    QuizPreQuestionListAPIView,
    QuizPostQuestionListAPIView,
    QuizAttemptUpsert,
    ProgressView,
    InboxListView,
    InboxReadToggleAPIView,
)

urlpatterns = [
    # 1. Signup
    path('signup/',  CustomStudentSignupAPIView.as_view(),       name='api-signup'),

    # 2. Profile (GET + PATCH)
    path('profile/', StudentProfileUpdateAPIView.as_view(),     name='api-student-profile'),

    # 3. Modules
    path('modules/',          ModuleListAPIView.as_view(),      name='api-module-list'),
    path('modules/<int:pk>/', ModuleDetailAPIView.as_view(),    name='api-module-detail'),
    path('modules/<int:pk>/response/', ResponseUpsert.as_view(), name='api-module-response'),

    # 4. Quiz questions
    path('quiz/pre/',  QuizPreQuestionListAPIView.as_view(),    name='api-quiz-pre'),
    path('quiz/post/', QuizPostQuestionListAPIView.as_view(),   name='api-quiz-post'),

    # 5. Quiz attempts
    path('quiz/attempt/', QuizAttemptUpsert.as_view(),          name='api-quiz-attempt'),

    # 6. Progress
    path('progress/',    ProgressView.as_view(),                name='api-progress'),

    # 7. Inbox
    path('inbox/',              InboxListView.as_view(),       name='api-inbox'),
    path('inbox/<int:pk>/read/', InboxReadToggleAPIView.as_view(), name='api-inbox-read'),
]
