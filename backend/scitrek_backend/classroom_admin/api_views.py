import csv
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.reverse import reverse
from kombu.exceptions import OperationalError

from .models import (
    Classroom,
    Student,
    ModuleAssignment,
    QuizAssignment,
    ScheduledMessage,
)
from student_activities.models import StudentResponse, QuizAttempt, Message
from .serializers import (
    ClassroomSerializer,
    RosterStudentSerializer,
    RosterAddSerializer,
    ModuleAssignmentSerializer,
    QuizAssignmentSerializer,
    ScheduledMessageSerializer,
)
from .tasks import schedule_message_task, send_scheduled_message_task
from scitrek_backend.private_files import private_file_response


CSV_FORMULA_PREFIXES = ('=', '+', '-', '@', '\t', '\r')


def csv_safe(value):
    text = '' if value is None else str(value)
    return f"'{text}" if text.startswith(CSV_FORMULA_PREFIXES) else text


def csv_export_filename(prefix, classroom_name):
    """Build a conservative ASCII filename for Content-Disposition."""
    classroom_slug = slugify(str(classroom_name), allow_unicode=False) or 'classroom'
    return f'{prefix}_{classroom_slug}.csv'


class IsTeacherUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_teacher)


class TaskQueueUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Task queue is unavailable; the operation was not scheduled.'
    default_code = 'task_queue_unavailable'


# — Classroom CRUD —
class ClassroomListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsTeacherUser]
    serializer_class = ClassroomSerializer

    @swagger_auto_schema(
        operation_summary="List your classrooms or create a new one",
        responses={200: ClassroomSerializer(many=True), 201: ClassroomSerializer()}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return Classroom.objects.filter(teacher=self.request.user).order_by('id')

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class ClassroomDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsTeacherUser]
    serializer_class = ClassroomSerializer
    # Classroom deletion cascades into curriculum and student work. Until an
    # explicit archival/retention workflow exists, the API must not expose it.
    http_method_names = ['get', 'put', 'patch', 'head', 'options']

    @swagger_auto_schema(
        operation_summary="Retrieve, update, or delete a classroom",
        responses={200: ClassroomSerializer()}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return Classroom.objects.filter(teacher=self.request.user)


# — Roster Management —
class RosterListAPIView(generics.ListAPIView):
    permission_classes = [IsTeacherUser]
    serializer_class = RosterStudentSerializer

    @swagger_auto_schema(
        operation_summary="List students enrolled in a classroom",
        responses={200: RosterStudentSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        return Student.objects.filter(classroom=classroom).order_by('user_id')


class RosterAddAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Add a student to the classroom roster",
        request_body=RosterAddSerializer,
        responses={201: RosterStudentSerializer()}
    )
    def post(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
        serializer = RosterAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(classroom=classroom)
        return Response(RosterStudentSerializer(profile).data, status=status.HTTP_201_CREATED)


class RosterRemoveAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Remove a student from the classroom roster",
        responses={204: 'No Content'}
    )
    def delete(self, request, pk, student_id):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=self.request.user)
        profile = get_object_or_404(Student, user__id=student_id, classroom=classroom)
        profile.classroom = None
        profile.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# — Module Assignments —
class ModuleAssignmentListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsTeacherUser]
    serializer_class = ModuleAssignmentSerializer

    @swagger_auto_schema(
        operation_summary="List or assign modules to a classroom",
        responses={200: ModuleAssignmentSerializer(many=True), 201: ModuleAssignmentSerializer()}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        return ModuleAssignment.objects.filter(classroom=classroom).order_by('id')

    def perform_create(self, serializer):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        module = serializer.validated_data['module']
        if module.classroom_id != classroom.id:
            raise ValidationError({'module': 'Module must belong to this classroom.'})
        if ModuleAssignment.objects.filter(classroom=classroom, module=module).exists():
            raise ValidationError({'module': 'Module is already assigned to this classroom.'})
        serializer.save(classroom=classroom)


class ModuleAssignmentDetailAPIView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsTeacherUser]
    serializer_class = ModuleAssignmentSerializer

    @swagger_auto_schema(
        operation_summary="Retrieve or unassign a module from a classroom",
        responses={200: ModuleAssignmentSerializer(), 204: 'No Content'}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        return ModuleAssignment.objects.filter(classroom=classroom)


# — Quiz Assignments —
class QuizAssignmentListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsTeacherUser]
    serializer_class = QuizAssignmentSerializer

    @swagger_auto_schema(
        operation_summary="List or assign pre/post quizzes",
        responses={200: QuizAssignmentSerializer(many=True), 201: QuizAssignmentSerializer()}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        return QuizAssignment.objects.filter(classroom=classroom).order_by('id')

    def perform_create(self, serializer):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        quiz_type = serializer.validated_data['quiz_type']
        if QuizAssignment.objects.filter(classroom=classroom, quiz_type=quiz_type).exists():
            raise ValidationError({'quiz_type': 'Quiz is already assigned to this classroom.'})
        serializer.save(classroom=classroom)


class QuizAssignmentDetailAPIView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsTeacherUser]
    serializer_class = QuizAssignmentSerializer

    @swagger_auto_schema(
        operation_summary="Retrieve or unassign a quiz",
        responses={200: QuizAssignmentSerializer(), 204: 'No Content'}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        return QuizAssignment.objects.filter(classroom=classroom)


# — Scheduled Messages —
class ScheduledMessageListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsTeacherUser]
    serializer_class = ScheduledMessageSerializer

    @swagger_auto_schema(
        operation_summary="List or schedule messages to students",
        responses={200: ScheduledMessageSerializer(many=True), 201: ScheduledMessageSerializer()}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        return ScheduledMessage.objects.filter(classroom=classroom).order_by('id')

    def perform_create(self, serializer):
        classroom = get_object_or_404(Classroom, pk=self.kwargs['pk'], teacher=self.request.user)
        msg = serializer.save(classroom=classroom)
        try:
            schedule_message_task.apply_async((msg.id,), eta=msg.scheduled_time)
        except OperationalError as exc:
            if msg.attachment:
                msg.attachment.delete(save=False)
            msg.delete()
            raise TaskQueueUnavailable() from exc


class ScheduledMessageSendNowAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Send a scheduled message immediately",
        responses={200: openapi.Response("status", schema=openapi.Schema(type=openapi.TYPE_STRING))}
    )
    def patch(self, request, pk, msg_id):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=self.request.user)
        msg = get_object_or_404(ScheduledMessage, pk=msg_id, classroom=classroom)
        try:
            send_scheduled_message_task.delay(msg.id)
        except OperationalError:
            send_scheduled_message_task(msg.id)
        return Response({'status': 'scheduled for immediate send'})


class TeacherMessageAttachmentDownloadAPIView(APIView):
    permission_classes = [IsTeacherUser]

    def get(self, request, pk, msg_id):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
        msg = get_object_or_404(ScheduledMessage, pk=msg_id, classroom=classroom)
        return private_file_response(msg.attachment)


# — Reporting —
class ClassroomProgressAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Get per-day completion percentages for a classroom",
        responses={200: openapi.Response('Progress by day')}
    )
    def get(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=self.request.user)
        total_students = classroom.students.count()
        data = []
        for day in range(1, 6):
            completed = StudentResponse.objects.filter(
                student__student_profile__classroom=classroom,
                module__classroom=classroom,
                module__day=day
            ).count()
            percent = (completed / total_students * 100) if total_students else 0
            data.append({'day': day, 'completed': completed, 'percent': percent})
        return Response({'total_students': total_students, 'by_day': data})


class ClassroomQuizOverviewAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Get class-average and all scores for pre/post quizzes",
        responses={200: openapi.Response('Quiz overview')}
    )
    def get(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=self.request.user)
        result = {}
        for qtype in [QuizAttempt.PRE, QuizAttempt.POST]:
            attempts = QuizAttempt.objects.filter(
                classroom=classroom,
                quiz_type=qtype
            )
            scores = list(attempts.values_list('score', flat=True))
            avg = sum(scores) / len(scores) if scores else 0
            result[qtype] = {'average': avg, 'scores': scores}
        return Response(result)


class StudentDetailAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Get detailed data for a single student",
        responses={200: openapi.Response('Student detail')}
    )
    def get(self, request, pk, student_id):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=self.request.user)
        profile = get_object_or_404(Student, user__id=student_id, classroom=classroom)

        response_records = StudentResponse.objects.filter(
            student=profile.user,
            module__classroom=classroom,
        ).select_related('module')
        responses = [
            {
                'id': record.pk,
                'module__day': record.module.day,
                'answers': record.answers,
                'file_upload': (
                    reverse(
                        'teacher-response-download',
                        kwargs={
                            'pk': classroom.pk,
                            'student_id': profile.user_id,
                            'response_id': record.pk,
                        },
                        request=request,
                    )
                    if record.file_upload else None
                ),
                'completed_at': record.completed_at,
            }
            for record in response_records
        ]
        quizzes = QuizAttempt.objects.filter(
            student=profile.user,
            classroom=classroom,
        ).values(
            'quiz_type', 'score', 'attempt_data', 'timestamp'
        )
        inbox = Message.objects.filter(
            recipient=profile.user,
            sender=classroom.teacher,
        ).values(
            'subject', 'body', 'timestamp', 'is_read'
        )

        return Response({
            'student': {
                'id':         profile.user.id,
                'username':   profile.user.username,
                'first_name': profile.first_name,
                'last_name':  profile.last_name,
            },
            'responses': responses,
            'quizzes':   list(quizzes),
            'inbox':     list(inbox),
        })


class TeacherResponseDownloadAPIView(APIView):
    permission_classes = [IsTeacherUser]

    def get(self, request, pk, student_id, response_id):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
        profile = get_object_or_404(Student, user_id=student_id, classroom=classroom)
        response = get_object_or_404(
            StudentResponse,
            pk=response_id,
            student=profile.user,
            module__classroom=classroom,
        )
        return private_file_response(response.file_upload)


# — CSV Export Endpoints —
class ClassroomRosterExportAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Download classroom roster as CSV",
        responses={200: openapi.Response('CSV file')}
    )
    def get(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
        students = Student.objects.filter(classroom=classroom)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = (
            f'attachment; filename="{csv_export_filename("roster", classroom.name)}"'
        )
        writer = csv.writer(response)
        writer.writerow(['id', 'username', 'first_name', 'last_name'])
        for s in students:
            writer.writerow([s.user.id, csv_safe(s.user.username), csv_safe(s.first_name), csv_safe(s.last_name)])
        return response


class ClassroomProgressExportAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Download module completion CSV",
        responses={200: openapi.Response('CSV file')}
    )
    def get(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
        total_students = classroom.students.count()

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = (
            f'attachment; filename="{csv_export_filename("progress", classroom.name)}"'
        )
        writer = csv.writer(response)
        writer.writerow(['day', 'completed', 'percent'])
        for day in range(1, 6):
            completed = StudentResponse.objects.filter(
                student__student_profile__classroom=classroom,
                module__classroom=classroom,
                module__day=day
            ).count()
            percent = (completed / total_students * 100) if total_students else 0
            writer.writerow([day, completed, f"{percent:.1f}"])
        return response


class ClassroomQuizExportAPIView(APIView):
    permission_classes = [IsTeacherUser]

    @swagger_auto_schema(
        operation_summary="Download quiz scores CSV",
        responses={200: openapi.Response('CSV file')}
    )
    def get(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = (
            f'attachment; filename="{csv_export_filename("quizzes", classroom.name)}"'
        )
        writer = csv.writer(response)
        writer.writerow(['quiz_type', 'student_id', 'username', 'score'])
        for attempt in QuizAttempt.objects.filter(
            classroom=classroom
        ):
            writer.writerow([
                attempt.quiz_type,
                attempt.student.id,
                csv_safe(attempt.student.username),
                attempt.score
            ])
        return response
