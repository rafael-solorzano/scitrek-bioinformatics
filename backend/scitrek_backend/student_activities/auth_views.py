# student_activities/auth_views.py
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from student_activities.tasks import seed_inbox_for_user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Let the view access the authenticated user after validation.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        # Make user accessible to the view
        self._authed_user = self.user
        # (Optional) include username for convenient debugging
        data["username"] = self.user.get_username()
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = serializer.validated_data
        user = getattr(serializer, "_authed_user", None)

        # Enqueue seeding for active students (idempotent: safe every login)
        if user and getattr(user, "is_active", False) and getattr(user, "is_student", False):
            seed_inbox_for_user.delay(user.id)

        return Response(tokens, status=status.HTTP_200_OK)
