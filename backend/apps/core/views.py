"""
VERIFAI — Core System Views
Operational telemetry, health check probes, and system status endpoints.
"""

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
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
