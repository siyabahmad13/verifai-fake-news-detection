"""
VERIFAI — Core System Views
Operational telemetry, health check probes, and system status endpoints.
"""

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from apps.ml_engine.model_loader import ModelLoader


class HealthCheckView(APIView):
    """
    Service health check probe.
    Returns backend service status and ML model cache status.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        loader = ModelLoader()
        is_model_loaded = loader.is_loaded()
        version = loader.get_version() if is_model_loaded else None

        return Response({
            "status": "healthy",
            "service": "verifai-backend",
            "version": "1.0.0",
            "model": {
                "loaded": is_model_loaded,
                "version": version
            }
        }, status=status.HTTP_200_OK)


class AdminOverviewStatsView(APIView):
    """
    High-level operational metrics and system telemetry for the Admin Dashboard.
    Requires Staff / Administrator privileges.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.accounts.models import User
        from apps.predictions.models import Prediction
        from apps.predictions.serializers import PredictionHistoryListSerializer
        from apps.feedback.models import Feedback
        from apps.feedback.serializers import FeedbackListSerializer
        from apps.datasets.models import Dataset, MLModelVersion
        from apps.datasets.serializers import DatasetListSerializer, MLModelVersionSerializer
        from apps.ml_engine.model_loader import model_loader

        # Aggregate metrics
        total_users = User.objects.count()
        total_predictions = Prediction.objects.count()
        real_predictions = Prediction.objects.filter(prediction__iexact='Real').count()
        fake_predictions = Prediction.objects.filter(prediction__iexact='Fake').count()
        total_feedback = Feedback.objects.count()
        pending_feedback = Feedback.objects.filter(status='pending').count()
        total_datasets = Dataset.objects.count()

        # Active ML model details
        active_model_instance = MLModelVersion.objects.filter(is_active=True).first()
        active_model_data = None
        if active_model_instance:
            active_model_data = MLModelVersionSerializer(active_model_instance).data
        else:
            active_model_data = {
                "version": model_loader.active_version or "v1-baseline",
                "model_name": "Logistic Regression",
                "vectorizer_name": "TfidfVectorizer",
                "is_active": True,
                "accuracy": 0.986,
                "precision": 0.9889,
                "recall": 0.9842,
                "f1_score": 0.9866,
                "notes": "Production baseline model loaded from filesystem artifacts."
            }

        # Recent activities (up to 5 records each)
        recent_predictions = PredictionHistoryListSerializer(
            Prediction.objects.select_related('user').all()[:5],
            many=True
        ).data

        recent_feedback = FeedbackListSerializer(
            Feedback.objects.select_related('prediction', 'user').all()[:5],
            many=True
        ).data

        recent_datasets = DatasetListSerializer(
            Dataset.objects.select_related('uploaded_by').all()[:5],
            many=True
        ).data

        return Response({
            "success": True,
            "data": {
                "total_users": total_users,
                "total_predictions": total_predictions,
                "real_predictions": real_predictions,
                "fake_predictions": fake_predictions,
                "total_feedback": total_feedback,
                "pending_feedback": pending_feedback,
                "total_datasets": total_datasets,
                "active_model": active_model_data,
                "recent_predictions": recent_predictions,
                "recent_feedback": recent_feedback,
                "recent_datasets": recent_datasets,
            }
        }, status=status.HTTP_200_OK)
