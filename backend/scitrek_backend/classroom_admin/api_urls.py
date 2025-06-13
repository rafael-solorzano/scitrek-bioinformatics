#classroom_admin/api_urls.py
from django.urls import path
from .api_views import (
    ClassroomListCreateAPIView,
    ClassroomDetailAPIView,
    RosterListAPIView,
    RosterAddAPIView,
    RosterRemoveAPIView,
    ModuleAssignmentListCreateAPIView,
    ModuleAssignmentDetailAPIView,
    QuizAssignmentListCreateAPIView,
    QuizAssignmentDetailAPIView,
    ScheduledMessageListCreateAPIView,
    ScheduledMessageSendNowAPIView,
    ClassroomProgressAPIView,
    ClassroomQuizOverviewAPIView,
    StudentDetailAPIView,
    ClassroomRosterExportAPIView,
    ClassroomProgressExportAPIView,
    ClassroomQuizExportAPIView,
)

urlpatterns = [
    # Classroom
    path('classrooms/',          ClassroomListCreateAPIView.as_view(),       name='teacher-classroom-list'),
    path('classrooms/<int:pk>/', ClassroomDetailAPIView.as_view(),        name='teacher-classroom-detail'),

    # Roster
    path('classrooms/<int:pk>/students/',                   RosterListAPIView.as_view(),            name='teacher-roster-list'),
    path('classrooms/<int:pk>/students/add/',               RosterAddAPIView.as_view(),             name='teacher-roster-add'),
    path('classrooms/<int:pk>/students/<int:student_id>/',  RosterRemoveAPIView.as_view(),          name='teacher-roster-remove'),

    # Module assignments
    path('classrooms/<int:pk>/assign-modules/',             ModuleAssignmentListCreateAPIView.as_view(), name='teacher-assign-modules'),
    path('classrooms/<int:pk>/assign-modules/<int:id>/',    ModuleAssignmentDetailAPIView.as_view(),     name='teacher-assign-module-detail'),

    # Quiz assignments
    path('classrooms/<int:pk>/assign-quizzes/',             QuizAssignmentListCreateAPIView.as_view(),   name='teacher-assign-quizzes'),
    path('classrooms/<int:pk>/assign-quizzes/<int:id>/',    QuizAssignmentDetailAPIView.as_view(),       name='teacher-assign-quiz-detail'),

    # Scheduling messages
    path('classrooms/<int:pk>/messages/',                   ScheduledMessageListCreateAPIView.as_view(), name='teacher-schedule-messages'),
    path('classrooms/<int:pk>/messages/<int:msg_id>/send-now/', ScheduledMessageSendNowAPIView.as_view(), name='teacher-send-message-now'),

    # Reporting
    path('classrooms/<int:pk>/progress/',                   ClassroomProgressAPIView.as_view(),       name='teacher-classroom-progress'),
    path('classrooms/<int:pk>/quizzes/',                    ClassroomQuizOverviewAPIView.as_view(),   name='teacher-classroom-quizzes'),
    path('classrooms/<int:pk>/students/<int:student_id>/details/', StudentDetailAPIView.as_view(),      name='teacher-student-details'),

    # CSV Exports
    path('classrooms/<int:pk>/export/roster/',              ClassroomRosterExportAPIView.as_view(),   name='teacher-export-roster'),
    path('classrooms/<int:pk>/export/progress/',            ClassroomProgressExportAPIView.as_view(), name='teacher-export-progress'),
    path('classrooms/<int:pk>/export/quizzes/',             ClassroomQuizExportAPIView.as_view(),     name='teacher-export-quizzes'),
]
