import logging
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from apps.core.responses import success_response, error_response
from apps.core.pagination import StandardResultsSetPagination
from apps.ml_engine.predictor import get_active_predictor
from apps.ml_engine.url_scraper import extract_article_from_url
from apps.ml_engine.exceptions import MLEngineError, InputValidationError
from .models import Prediction
from .serializers import (
    TextPredictionInputSerializer,
    UrlPredictionInputSerializer,
    PredictionResponseSerializer,
    PredictionHistoryListSerializer,
    PredictionHistoryDetailSerializer,
)

logger = logging.getLogger(__name__)


class PredictTextView(APIView):
    """
    Submit raw news article text (and optional headline) for AI-based
    authenticity classification and confidence estimation.
    """
    permission_classes = [AllowAny]
    serializer_class = TextPredictionInputSerializer
    throttle_scope = 'predict'

    @extend_schema(
        request=TextPredictionInputSerializer,
        responses={200: PredictionResponseSerializer},
        summary="Predict authenticity from raw article text"
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Invalid prediction input.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        text = serializer.validated_data['text']
        headline = serializer.validated_data.get('headline', '')

        try:
            predictor = get_active_predictor()
            result = predictor.predict(text=text, headline=headline)

            # Persist prediction record
            user = request.user if request.user.is_authenticated else None
            record = Prediction.objects.create(
                user=user,
                input_type='text',
                headline=headline if headline else text.split('\n')[0][:100],
                input_text=text,
                prediction=result.label,
                confidence=result.confidence,
                probabilities=result.probabilities,
                model_version=result.model_version,
                word_count=result.word_count,
                char_count=result.char_count
            )

            logger.info(
                "Prediction generated: %s (confidence=%.2f%%, user=%s, id=%s)",
                result.label, result.confidence, user, record.id
            )

            response_data = PredictionResponseSerializer(record).data
            return success_response(
                data=response_data,
                message="Content evaluated successfully."
            )

        except InputValidationError as e:
            return error_response(message=str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except MLEngineError as e:
            logger.error("ML Engine processing failure: %s", e)
            return error_response(
                message="The prediction service encountered an internal error. Please try again.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PredictUrlView(APIView):
    """
    Submit an article URL to be safely scraped, parsed, and verified.
    Guarded against SSRF, internal network traversal, and large payload attacks.
    """
    permission_classes = [AllowAny]
    serializer_class = UrlPredictionInputSerializer
    throttle_scope = 'predict'

    @extend_schema(
        request=UrlPredictionInputSerializer,
        responses={200: PredictionResponseSerializer},
        summary="Scrape article URL and predict authenticity"
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Invalid URL input.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        url = serializer.validated_data['url']

        try:
            # 1. Safe extraction
            extracted = extract_article_from_url(url)

            # 2. Inference
            predictor = get_active_predictor()
            result = predictor.predict(
                text=extracted['text'],
                headline=extracted['headline']
            )

            # 3. Persist record
            user = request.user if request.user.is_authenticated else None
            record = Prediction.objects.create(
                user=user,
                input_type='url',
                url=url,
                headline=extracted['headline'] or url,
                input_text=extracted['text'],
                prediction=result.label,
                confidence=result.confidence,
                probabilities=result.probabilities,
                model_version=result.model_version,
                word_count=result.word_count,
                char_count=result.char_count
            )

            logger.info(
                "URL prediction generated: %s for %s (id=%s)",
                result.label, url, record.id
            )

            response_data = PredictionResponseSerializer(record).data
            return success_response(
                data=response_data,
                message="URL content retrieved and verified successfully."
            )

        except InputValidationError as e:
            return error_response(message=str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except MLEngineError as e:
            return error_response(
                message="The prediction engine failed to process the article text.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PredictionHistoryListView(APIView):
    """
    Retrieve paginated verification history for the authenticated user.
    Supports filtering by classification verdict, source modality, or search keyword.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        parameters=[
            OpenApiParameter('prediction', str, description="Filter by verdict: 'Real' or 'Fake'"),
            OpenApiParameter('input_type', str, description="Filter by modality: 'text' or 'url'"),
            OpenApiParameter('search', str, description="Search claim headline or content"),
            OpenApiParameter('all', bool, description="Admin-only: View system-wide prediction logs"),
        ],
        responses={200: PredictionHistoryListSerializer(many=True)},
        summary="List user's prediction history"
    )
    def get(self, request):
        user = request.user
        queryset = Prediction.objects.all()

        # Authorization: regular users can only see their own predictions
        if user.is_staff and request.query_params.get('all', '').lower() == 'true':
            pass  # Admin viewing global logs
        else:
            queryset = queryset.filter(user=user)

        # Filtering
        verdict = request.query_params.get('prediction')
        if verdict:
            queryset = queryset.filter(prediction__iexact=verdict)

        input_type = request.query_params.get('input_type')
        if input_type:
            queryset = queryset.filter(input_type=input_type.lower())

        search_query = request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(headline__icontains=search_query) | Q(input_text__icontains=search_query)
            )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = PredictionHistoryListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class PredictionHistoryDetailView(APIView):
    """
    Retrieve or delete an individual verification audit record.
    Enforces object-level ownership checks.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, prediction_id, user):
        prediction = get_object_or_404(Prediction, id=prediction_id)
        # Object-level permission check
        if not user.is_staff and prediction.user != user:
            return None
        return prediction

    @extend_schema(
        responses={200: PredictionHistoryDetailSerializer},
        summary="Retrieve detailed prediction record by UUID"
    )
    def get(self, request, id):
        prediction = self.get_object(id, request.user)
        if prediction is None:
            return error_response(
                message="You do not have permission to access this prediction record.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        serializer = PredictionHistoryDetailSerializer(prediction)
        return success_response(
            data=serializer.data,
            message="Prediction record retrieved successfully."
        )

    @extend_schema(
        responses={200: OpenApiResponse(description="Record deleted successfully")},
        summary="Delete a prediction record from personal history"
    )
    def delete(self, request, id):
        prediction = self.get_object(id, request.user)
        if prediction is None:
            return error_response(
                message="You do not have permission to delete this prediction record.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        prediction.delete()
        logger.info("Prediction record deleted: %s by %s", id, request.user.email)
        return success_response(
            message="Prediction record deleted successfully."
        )
