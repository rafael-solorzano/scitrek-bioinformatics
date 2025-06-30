# student_activities/api_urls.py
from django.urls import path
from .api_views import (
    CustomStudentSignupAPIView,
    StudentProfileUpdateAPIView,
    ModuleListAPIView,
    ModuleDetailAPIView,
    ResponseUpsert,
    ResponseDetailAPIView,
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

    # 4. Responses
    path(
      'modules/<int:pk>/response/',
      ResponseUpsert.as_view(),
      name='api-module-response'
    ),
    path(
      'modules/<int:pk>/response/detail/',
      ResponseDetailAPIView.as_view(),
      name='api-module-response-detail'
    ),

    # 5. Quiz questions
    path('quiz/pre/',  QuizPreQuestionListAPIView.as_view(),    name='api-quiz-pre'),
    path('quiz/post/', QuizPostQuestionListAPIView.as_view(),   name='api-quiz-post'),

    # 6. Quiz attempts
    path('quiz/attempt/', QuizAttemptUpsert.as_view(),          name='api-quiz-attempt'),

    # 7. Progress
    path('progress/',    ProgressView.as_view(),                name='api-progress'),

    # 8. Inbox
    path('inbox/',              InboxListView.as_view(),       name='api-inbox'),
    path('inbox/<int:pk>/read/', InboxReadToggleAPIView.as_view(), name='api-inbox-read'),
]
