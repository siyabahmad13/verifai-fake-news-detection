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
        summary="Register a new organization or user account"
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

from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.permissions import IsAdminUser
from apps.core.pagination import StandardResultsSetPagination
from .models import User
from .serializers import (
    AdminUserListSerializer,
    AdminUserStatusUpdateSerializer,
)


class AdminUserListView(APIView):
    """
    List and filter all registered users in VerifAI.
    Requires Staff / Administrator privileges.
    """
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        queryset = User.objects.all().order_by('-date_joined')

        # Filter by search keyword
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(institution__icontains=search)
            )

        # Filter by role
        role = request.query_params.get('role', '').strip()
        if role:
            queryset = queryset.filter(role__iexact=role)

        # Filter by is_active status
        is_active_param = request.query_params.get('is_active', '').strip().lower()
        if is_active_param in ('true', '1'):
            queryset = queryset.filter(is_active=True)
        elif is_active_param in ('false', '0'):
            queryset = queryset.filter(is_active=False)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AdminUserListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminUserDetailView(APIView):
    """
    Retrieve full account details for an individual user.
    Requires Staff / Administrator privileges.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, id):
        user_obj = get_object_or_404(User, id=id)
        serializer = AdminUserListSerializer(user_obj)
        return success_response(
            data=serializer.data,
            message="User details retrieved successfully."
        )


class AdminUserToggleStatusView(APIView):
    """
    Activate or deactivate a user account.
    Safety checks prevent an admin from deactivating their own account.
    """
    permission_classes = [IsAdminUser]

    def patch(self, request, id):
        user_obj = get_object_or_404(User, id=id)

        # Safety Check: Cannot deactivate own account
        if request.user.id == user_obj.id:
            return error_response(
                message="You cannot deactivate your own administrative account.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminUserStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Invalid status update payload.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        new_status = serializer.validated_data['is_active']
        user_obj.is_active = new_status
        user_obj.save(update_fields=['is_active', 'updated_at'])

        status_word = "activated" if new_status else "deactivated"
        logger.info("Admin %s %s user account %s", request.user.email, status_word, user_obj.email)

        return success_response(
            data=AdminUserListSerializer(user_obj).data,
            message=f"User account {user_obj.email} successfully {status_word}."
        )
