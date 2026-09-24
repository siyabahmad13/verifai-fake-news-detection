import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.core.responses import success_response, error_response
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserLogoutSerializer,
)

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    """
    Generate JWT access and refresh token pair for a user.
    """
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    """
    Register a new user account.
    Returns the created user profile and a freshly generated JWT token pair.
    """
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    @extend_schema(
        request=UserRegistrationSerializer,
        responses={201: OpenApiResponse(description="User registered successfully")},
        summary="Register a new researcher account"
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Registration validation failed.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.save()
        tokens = get_tokens_for_user(user)
        user_data = UserProfileSerializer(user).data

        logger.info("New user registered: %s (ID: %s)", user.email, user.id)

        return success_response(
            data={
                "user": user_data,
                "tokens": tokens
            },
            message="User registered successfully.",
            status_code=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    """
    Authenticate an existing user via email and password.
    Returns JWT access & refresh tokens along with user profile metadata.
    """
    permission_classes = [AllowAny]
    serializer_class = UserLoginSerializer

    @extend_schema(
        request=UserLoginSerializer,
        responses={200: OpenApiResponse(description="Login successful")},
        summary="Authenticate user and obtain JWT tokens"
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Authentication failed.",
                errors=serializer.errors,
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        user_data = UserProfileSerializer(user).data

        logger.info("User logged in: %s", user.email)

        return success_response(
            data={
                "user": user_data,
                "tokens": tokens
            },
            message="Authentication successful."
        )


class CustomTokenRefreshView(TokenRefreshView):
    """
    Refresh an expired JWT access token using a valid refresh token.
    """
    @extend_schema(summary="Refresh access token")
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            return success_response(
                data=response.data,
                message="Token refreshed successfully."
            )
        return error_response(
            message="Failed to refresh token.",
            errors=response.data,
            status_code=response.status_code
        )


class LogoutView(APIView):
    """
    Blacklist the active refresh token to securely terminate the user session.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserLogoutSerializer

    @extend_schema(
        request=UserLogoutSerializer,
        responses={200: OpenApiResponse(description="Logout successful")},
        summary="Blacklist refresh token and logout"
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Logout validation failed.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        serializer.save()
        logger.info("User logged out: %s", request.user.email)

        return success_response(
            message="Logout successful. Session token invalidated."
        )


class UserProfileView(APIView):
    """
    Retrieve or update the authenticated user's profile details.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    @extend_schema(
        responses={200: UserProfileSerializer},
        summary="Get current user profile"
    )
    def get(self, request):
        serializer = self.serializer_class(request.user)
        return success_response(
            data=serializer.data,
            message="Profile retrieved successfully."
        )

    @extend_schema(
        request=UserProfileSerializer,
        responses={200: UserProfileSerializer},
        summary="Update current user profile"
    )
    def patch(self, request):
        serializer = self.serializer_class(
            request.user,
            data=request.data,
            partial=True
        )
        if not serializer.is_valid():
            return error_response(
                message="Profile update failed.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        updated_user = serializer.save()
        logger.info("User profile updated: %s", updated_user.email)

        return success_response(
            data=serializer.data,
            message="Profile updated successfully."
        )
