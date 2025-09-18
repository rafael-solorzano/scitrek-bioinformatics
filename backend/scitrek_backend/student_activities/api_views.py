# student_activities/api_views.py

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.generics import RetrieveAPIView
from django.shortcuts import get_object_or_404

from classroom_admin.models import Student as StudentProfile
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

# ── 1. Signup ──────────────────────────────────────────────────────────────────────
class CustomStudentSignupAPIView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class   = CustomStudentSignupSerializer

# ── 2. Profile (GET + PATCH) ──────────────────────────────────────────────────────
class StudentProfileUpdateAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

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
        return Module.objects.filter(classroom=classroom).order_by('day')

class ModuleDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = ModuleSerializer

    def get_object(self):
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        return get_object_or_404(Module, pk=self.kwargs['pk'], classroom=classroom)

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
        module = get_object_or_404(Module, day=day, classroom=classroom)

        # Only include relevant response fields (answers and optional file_upload)
        allowed_fields = ['answers', 'file_upload']
        defaults = {field: request.data[field] for field in allowed_fields if field in request.data}

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
        module = get_object_or_404(Module, day=self.kwargs['day'], classroom=classroom)
        return get_object_or_404(StudentResponse, student=self.request.user, module=module)


# ── 5. Quiz attempts ────────────────────────────────────────────────────────────────
class QuizAttemptUpsert(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    throttle_classes   = [ScopedRateThrottle]
    throttle_scope     = 'quiz'
    serializer_class   = QuizAttemptSerializer

    def post(self, request):
        qt        = request.data.get('quiz_type')
        classroom = get_object_or_404(StudentProfile, user=request.user).classroom
        get_object_or_404(QuizQuestion, quiz_type=qt, classroom=classroom)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj, created = QuizAttempt.objects.update_or_create(
            student=request.user,
            quiz_type=serializer.validated_data['quiz_type'],
            defaults=serializer.validated_data
        )
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(self.get_serializer(obj).data, status=code)

# ── 6. Quiz questions ─────────────────────────────────────────────────────────────
class QuizPreQuestionListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = QuizQuestionSerializer

    def get_queryset(self):
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        return QuizQuestion.objects.filter(quiz_type=QuizQuestion.PRE, classroom=classroom)

class QuizPostQuestionListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = QuizQuestionSerializer

    def get_queryset(self):
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        return QuizQuestion.objects.filter(quiz_type=QuizQuestion.POST, classroom=classroom)

# ── 7. Progress ────────────────────────────────────────────────────────────────────
class ProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        completed = StudentResponse.objects.filter(
            student=request.user
        ).values_list('module__day', flat=True)
        pre  = QuizAttempt.objects.filter(student=request.user, quiz_type=QuizAttempt.PRE).first()
        post = QuizAttempt.objects.filter(student=request.user, quiz_type=QuizAttempt.POST).first()
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
        classroom = get_object_or_404(StudentProfile, user=self.request.user).classroom
        return Message.objects.filter(
            sender__username='virtual_scientist',
            recipient=self.request.user
        ).order_by('-timestamp')

class InboxReadToggleAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        classroom = get_object_or_404(StudentProfile, user=request.user).classroom
        msg = get_object_or_404(
            Message,
            pk=pk,
            recipient=request.user,
            sender__username='virtual_scientist'
        )
        msg.is_read = request.data.get('is_read', True)
        msg.save()
        return Response(ReadOnlyMessageSerializer(msg).data)
