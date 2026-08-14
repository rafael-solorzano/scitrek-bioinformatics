# student_activities/api_views.py

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.generics import RetrieveAPIView
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework_simplejwt.tokens import RefreshToken

from classroom_admin.models import Classroom, Student as StudentProfile
from .models import Module, StudentResponse, QuizAttempt, Message, QuizQuestion
from .serializers import (
    CustomStudentSignupSerializer,
    StudentProfileSerializer,
    StudentProfileUpdateSerializer,
    ModuleSerializer,
    StudentResponseSerializer,
    QuizAttemptSerializer,
    ReadOnlyMessageSerializer,
    QuizQuestionSerializer
)
from .services import released_modules, released_quiz_assignments, score_quiz_answers
from scitrek_backend.private_files import private_file_response

User = get_user_model()

# ── 1. Signup ──────────────────────────────────────────────────────────────────────
class CustomStudentSignupAPIView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup'
    serializer_class   = CustomStudentSignupSerializer

    def create(self, request, *args, **kwargs):
        if not settings.PUBLIC_SIGNUP_ENABLED:
            return Response(
                {'detail': 'Public signup is not enabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_token_payload_for_user(user), status=status.HTTP_201_CREATED)

class GuestLoginAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'guest_login'

    def post(self, request):
        if not settings.GUEST_LOGIN_ENABLED:
            return Response(
                {'detail': 'Guest login is not enabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        classroom_name = request.data.get('classroom_name') or settings.GUEST_CLASSROOM_NAME
        if classroom_name != settings.GUEST_CLASSROOM_NAME:
            return Response(
                {'detail': 'Guest login is restricted to the configured demo classroom.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        classroom = get_object_or_404(Classroom, name=classroom_name)
        suffix = get_random_string(10).lower()
        username = f"guest_{suffix}"

        user = User.objects.create_user(
            username=username,
            password=get_random_string(32),
            first_name='Guest',
            last_name='Scientist',
            is_student=True,
            is_active=True,
            date_joined=timezone.now(),
        )
        StudentProfile.objects.create(
            user=user,
            classroom=classroom,
            first_name=user.first_name,
            last_name=user.last_name,
        )

        return Response(_token_payload_for_user(user, classroom.name, True), status=status.HTTP_201_CREATED)


def _token_payload_for_user(user, classroom_name=None, is_guest=False):
    refresh = RefreshToken.for_user(user)
    if classroom_name is None:
        profile = getattr(user, 'student_profile', None)
        classroom_name = profile.classroom.name if profile and profile.classroom else None
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'username': user.username,
        'classroom_name': classroom_name,
        'is_guest': is_guest,
    }

# ── 2. Profile (GET + PATCH) ──────────────────────────────────────────────────────
class StudentProfileUpdateAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_object(self):
        return get_object_or_404(StudentProfile, user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return StudentProfileSerializer
        return StudentProfileUpdateSerializer

# ── 3. Modules ─────────────────────────────────────────────────────────────────────
class ModuleListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = ModuleSerializer

    def get_queryset(self):
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        return released_modules(classroom).order_by('day')

class ModuleDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = ModuleSerializer

    def get_object(self):
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        return get_object_or_404(released_modules(classroom), pk=self.kwargs['pk'])

# ── 4. Responses ───────────────────────────────────────────────────────────────────
class ResponseUpsert(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'response'
    serializer_class = StudentResponseSerializer

    def post(self, request, day):
        # Ensure module belongs to this student's classroom by day
        classroom = get_object_or_404(StudentProfile, user=request.user).classroom
        module = get_object_or_404(released_modules(classroom), day=day)

        payload = {
            'module': module.id,
            'answers': request.data.get('answers'),
        }
        if 'file_upload' in request.data:
            payload['file_upload'] = request.data['file_upload']

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        defaults = {
            'answers': serializer.validated_data['answers'],
        }
        if 'file_upload' in serializer.validated_data:
            defaults['file_upload'] = serializer.validated_data['file_upload']

        obj, created = StudentResponse.objects.update_or_create(
            student=request.user,
            module=module,
            defaults=defaults
        )

        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(self.get_serializer(obj).data, status=code)


class ResponseDetailAPIView(RetrieveAPIView):
    """
    GET /api/student/modules/{day}/response/detail/
    Retrieves the existing StudentResponse for this user & module.
    404 if none exists.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = StudentResponseSerializer

    def get_object(self):
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        module = get_object_or_404(released_modules(classroom), day=self.kwargs['day'])
        return get_object_or_404(StudentResponse, student=self.request.user, module=module)


class ResponseFileDownloadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        profile = get_object_or_404(StudentProfile, user=request.user)
        response = get_object_or_404(
            StudentResponse,
            pk=pk,
            student=request.user,
            module__classroom=profile.classroom,
        )
        return private_file_response(response.file_upload)


# ── 5. Quiz attempts ────────────────────────────────────────────────────────────────
class QuizAttemptUpsert(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    throttle_classes   = [ScopedRateThrottle]
    throttle_scope     = 'quiz'
    serializer_class   = QuizAttemptSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        qt = serializer.validated_data['quiz_type']
        classroom = get_object_or_404(StudentProfile, user=request.user).classroom
        get_object_or_404(released_quiz_assignments(classroom), quiz_type=qt)
        questions = list(QuizQuestion.objects.filter(
            quiz_type=qt,
            classroom=classroom,
        ).order_by('id'))
        if not questions:
            get_object_or_404(QuizQuestion, quiz_type=qt, classroom=classroom)

        attempt_data, score = score_quiz_answers(
            questions,
            serializer.validated_data['attempt_data'],
        )
        obj, created = QuizAttempt.objects.update_or_create(
            student=request.user,
            classroom=classroom,
            quiz_type=serializer.validated_data['quiz_type'],
            defaults={
                'attempt_data': attempt_data,
                'score': score,
            },
        )
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(self.get_serializer(obj).data, status=code)

# ── 6. Quiz questions ─────────────────────────────────────────────────────────────
class QuizPreQuestionListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = QuizQuestionSerializer

    def get_queryset(self):
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        if not released_quiz_assignments(classroom).filter(quiz_type=QuizQuestion.PRE).exists():
            return QuizQuestion.objects.none()
        return QuizQuestion.objects.filter(quiz_type=QuizQuestion.PRE, classroom=classroom).order_by('id')

class QuizPostQuestionListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = QuizQuestionSerializer

    def get_queryset(self):
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        if not released_quiz_assignments(classroom).filter(quiz_type=QuizQuestion.POST).exists():
            return QuizQuestion.objects.none()
        return QuizQuestion.objects.filter(quiz_type=QuizQuestion.POST, classroom=classroom).order_by('id')

# ── 7. Progress ────────────────────────────────────────────────────────────────────
class ProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        completed = StudentResponse.objects.filter(
            student=request.user,
            module__classroom=get_object_or_404(StudentProfile, user=request.user).classroom,
        ).values_list('module__day', flat=True)
        classroom = request.user.student_profile.classroom
        pre = QuizAttempt.objects.filter(
            student=request.user, classroom=classroom, quiz_type=QuizAttempt.PRE
        ).first()
        post = QuizAttempt.objects.filter(
            student=request.user, classroom=classroom, quiz_type=QuizAttempt.POST
        ).first()
        return Response({
            'completed_days': sorted(completed),
            'pre_score':      pre.score  if pre  else None,
            'post_score':     post.score if post else None,
        })

# ── 8. Inbox ───────────────────────────────────────────────────────────────────────
class InboxListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = ReadOnlyMessageSerializer

    def get_queryset(self):
        return _inbox_messages_for_user(self.request.user).order_by('-timestamp')

class InboxReadToggleAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        msg = get_object_or_404(
            _inbox_messages_for_user(request.user),
            pk=pk,
        )
        msg.is_read = request.data.get('is_read', True)
        msg.save()
        return Response(ReadOnlyMessageSerializer(msg).data)


class InboxAttachmentDownloadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        msg = get_object_or_404(_inbox_messages_for_user(request.user), pk=pk)
        return private_file_response(msg.attachment)


def _inbox_messages_for_user(user):
    profile = get_object_or_404(StudentProfile, user=user)
    allowed_senders = Q(sender__username='virtual_scientist')
    if profile.classroom_id:
        allowed_senders |= Q(sender_id=profile.classroom.teacher_id)
    return Message.objects.filter(allowed_senders, recipient=user)
