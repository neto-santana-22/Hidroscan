from django.contrib.auth import login, logout
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import User
from .permissions import IsAdministratorRole
from .serializers import EmailVerificationSerializer, LoginSerializer, UserCreateSerializer, UserSerializer
from .services import AccountValidationError, authenticate_user, create_user, verify_email


def csrf_required(view):
    protected_view = csrf_protect(view)
    protected_view.__dict__.pop("csrf_exempt", None)
    return protected_view


@extend_schema(responses={204: None})
@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request):
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(request=LoginSerializer, responses={200: UserSerializer})
@csrf_required
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        user = authenticate_user(request=request, **serializer.validated_data)
    except AccountValidationError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    login(request, user)
    return Response(UserSerializer(user).data)


@extend_schema(request=None, responses={204: None})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(responses=UserSerializer)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@extend_schema(request=EmailVerificationSerializer, responses=UserSerializer)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def email_verification(request):
    serializer = EmailVerificationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        verify_email(user=request.user, code=serializer.validated_data["code"])
    except AccountValidationError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by("email")
    permission_classes = [IsAdministratorRole]

    def get_serializer_class(self):
        return UserCreateSerializer if self.action == "create" else UserSerializer

    def perform_create(self, serializer):
        serializer.instance = create_user(**serializer.validated_data)
