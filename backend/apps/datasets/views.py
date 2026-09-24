import logging
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.core.responses import success_response, error_response
from apps.core.pagination import StandardResultsSetPagination
from .models import Dataset, MLModelVersion
from .serializers import (
    DatasetUploadSerializer,
    DatasetListSerializer,
    DatasetDetailSerializer,
    MLModelVersionSerializer,
)

logger = logging.getLogger(__name__)


class DatasetUploadView(APIView):
    """
    Upload and validate a new news training or evaluation corpus (CSV/XLSX).
    Admin-only access.
    """
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = DatasetUploadSerializer

    @extend_schema(
        request=DatasetUploadSerializer,
        responses={201: DatasetDetailSerializer},
        summary="Upload and validate a news dataset (Admin only)"
    )
    def post(self, request):
        serializer = self.serializer_class(
            data=request.data,
            context={'request': request}
        )
        if not serializer.is_valid():
            return error_response(
                message="Dataset validation failed.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        dataset = serializer.save()
        logger.info(
            "New dataset uploaded and validated: %s (Rows: %d, ID: %s)",
            dataset.name, dataset.row_count, dataset.id
        )

        response_data = DatasetDetailSerializer(dataset).data
        return success_response(
            data=response_data,
            message="Dataset uploaded, validated, and registered in catalog.",
            status_code=status.HTTP_201_CREATED
        )


class DatasetListView(APIView):
    """
    List all registered datasets in the training catalog. Admin-only access.
    """
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        responses={200: DatasetListSerializer(many=True)},
        summary="List all registered datasets (Admin only)"
    )
    def get(self, request):
        queryset = Dataset.objects.all()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = DatasetListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class DatasetDetailView(APIView):
    """
    Retrieve full metadata and validation diagnostics for a dataset.
    """
    permission_classes = [IsAdminUser]

    @extend_schema(
        responses={200: DatasetDetailSerializer},
        summary="Retrieve dataset details by UUID (Admin only)"
    )
    def get(self, request, id):
        dataset = get_object_or_404(Dataset, id=id)
        serializer = DatasetDetailSerializer(dataset)
        return success_response(
            data=serializer.data,
            message="Dataset metadata retrieved successfully."
        )


class MLModelVersionListView(APIView):
    """
    Retrieve all ML model versions, evaluation metrics, and active production status.
    Accessible to all authenticated researchers for algorithmic transparency.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        responses={200: MLModelVersionSerializer(many=True)},
        summary="List all model versions and evaluation benchmarks"
    )
    def get(self, request):
        queryset = MLModelVersion.objects.all()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = MLModelVersionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class MLModelVersionActivateView(APIView):
    """
    Admin approval action to designate a specific model version as the active
    production prediction engine. Hot-swaps the model in memory.
    """
    permission_classes = [IsAdminUser]
    serializer_class = MLModelVersionSerializer

    @extend_schema(
        responses={200: MLModelVersionSerializer},
        summary="Activate a model version for production inference (Admin only)"
    )
    def post(self, request, id):
        model_version = get_object_or_404(MLModelVersion, id=id)
        model_version.activate()

        logger.info(
            "Model version '%s' activated for production by %s",
            model_version.version, request.user.email
        )

        response_data = MLModelVersionSerializer(model_version).data
        return success_response(
            data=response_data,
            message=f"Model version '{model_version.version}' is now active in production."
        )
