import logging
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from apps.core.responses import success_response, error_response
from apps.core.pagination import StandardResultsSetPagination
from .models import Feedback
from .serializers import (
    FeedbackCreateSerializer,
    FeedbackListSerializer,
    FeedbackDetailSerializer,
    FeedbackReviewSerializer,
)

logger = logging.getLogger(__name__)


class FeedbackListCreateView(APIView):
    """
    List user-submitted feedback reports or submit a new discrepancy report.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        request=FeedbackCreateSerializer,
        responses={201: FeedbackDetailSerializer},
        summary="Submit human-in-the-loop prediction feedback"
    )
    def post(self, request):
        serializer = FeedbackCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if not serializer.is_valid():
            return error_response(
                message="Feedback submission failed validation.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        feedback = serializer.save()
        logger.info(
            "Feedback report submitted: ID %s on Prediction %s by %s",
            feedback.id, feedback.prediction_id, request.user.email
        )

        response_data = FeedbackDetailSerializer(feedback).data
        return success_response(
            data=response_data,
            message="Feedback report submitted successfully for editorial review.",
            status_code=status.HTTP_201_CREATED
        )

    @extend_schema(
        parameters=[
            OpenApiParameter('status', str, description="Filter by status: 'pending', 'approved', 'rejected'"),
            OpenApiParameter('all', bool, description="Admin-only: View system-wide feedback reports"),
        ],
        responses={200: FeedbackListSerializer(many=True)},
        summary="List submitted feedback reports"
    )
    def get(self, request):
        user = request.user
        queryset = Feedback.objects.select_related('prediction', 'user').all()

        if user.is_staff and request.query_params.get('all', '').lower() == 'true':
            pass  # Staff viewing all feedback
        else:
            queryset = queryset.filter(user=user)

        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.lower())

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = FeedbackListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class FeedbackDetailView(APIView):
    """
    Retrieve full details for an individual feedback submission.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, feedback_id, user):
        feedback = get_object_or_404(Feedback, id=feedback_id)
        if not user.is_staff and feedback.user != user:
            return None
        return feedback

    @extend_schema(
        responses={200: FeedbackDetailSerializer},
        summary="Retrieve feedback details by UUID"
    )
    def get(self, request, id):
        feedback = self.get_object(id, request.user)
        if feedback is None:
            return error_response(
                message="You do not have permission to view this feedback report.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        serializer = FeedbackDetailSerializer(feedback)
        return success_response(
            data=serializer.data,
            message="Feedback record retrieved successfully."
        )


class FeedbackReviewView(APIView):
    """
    Admin endpoint to inspect, approve, or reject user discrepancy feedback.
    """
    permission_classes = [IsAdminUser]
    serializer_class = FeedbackReviewSerializer

    @extend_schema(
        request=FeedbackReviewSerializer,
        responses={200: FeedbackDetailSerializer},
        summary="Admin review: update status of a feedback report"
    )
    def patch(self, request, id):
        feedback = get_object_or_404(Feedback, id=id)
        serializer = self.serializer_class(feedback, data=request.data, partial=True)

        if not serializer.is_valid():
            return error_response(
                message="Review submission failed validation.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        feedback.status = serializer.validated_data['status']
        feedback.admin_notes = serializer.validated_data.get('admin_notes', feedback.admin_notes)
        feedback.reviewed_at = timezone.now()
        feedback.reviewed_by = request.user
        feedback.save()

        logger.info(
            "Feedback %s reviewed by %s (new status: %s)",
            feedback.id, request.user.email, feedback.status
        )

        response_data = FeedbackDetailSerializer(feedback).data
        return success_response(
            data=response_data,
            message=f"Feedback status updated to '{feedback.status}'."
        )
