from rest_framework import serializers
from .models import Dataset, MLModelVersion
from .validator import validate_dataset_file


class DatasetUploadSerializer(serializers.ModelSerializer):
    """
    Serializer for uploading and validating a new training corpus.
    """
    class Meta:
        model = Dataset
        fields = [
            'id',
            'name',
            'version',
            'description',
            'file',
            'is_external_benchmark',
        ]
        read_only_fields = ['id']

    def validate_file(self, value):
        report = validate_dataset_file(value)
        if not report['is_valid']:
            raise serializers.ValidationError(report['errors'])
        self.validation_report = report
        return value

    def create(self, validated_data):
        user = self.context['request'].user if self.context.get('request') else None
        report = getattr(self, 'validation_report', {})

        dataset = Dataset.objects.create(
            name=validated_data['name'],
            version=validated_data.get('version', '1.0'),
            description=validated_data.get('description', ''),
            file=validated_data['file'],
            is_external_benchmark=validated_data.get('is_external_benchmark', False),
            uploaded_by=user,
            row_count=report.get('valid_rows', report.get('row_count', 0)),
            label_distribution=report.get('label_distribution', {}),
            validation_status='valid' if report.get('is_valid') else 'invalid',
            validation_errors=report.get('errors', [])
        )
        return dataset


class DatasetListSerializer(serializers.ModelSerializer):
    """
    Summary view of registered datasets with file metadata for Admin Dashboard.
    """
    dataset_id = serializers.UUIDField(source='id', read_only=True)
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    file_type = serializers.SerializerMethodField()
    file_url = serializers.FileField(source='file', read_only=True)

    class Meta:
        model = Dataset
        fields = [
            'dataset_id',
            'name',
            'version',
            'file_name',
            'file_size',
            'file_type',
            'file_url',
            'row_count',
            'label_distribution',
            'validation_status',
            'is_external_benchmark',
            'uploaded_by_email',
            'created_at',
        ]

    def get_file_name(self, obj):
        import os
        return os.path.basename(obj.file.name) if obj.file else ''

    def get_file_size(self, obj):
        try:
            return obj.file.size if obj.file else 0
        except Exception:
            return 0

    def get_file_type(self, obj):
        import os
        if not obj.file:
            return ''
        ext = os.path.splitext(obj.file.name)[1].lower()
        return ext.replace('.', '').upper()


class DatasetDetailSerializer(serializers.ModelSerializer):
    """
    Full metadata for a dataset including file URL and validation errors.
    """
    dataset_id = serializers.UUIDField(source='id', read_only=True)
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)
    file_url = serializers.FileField(source='file', read_only=True)

    class Meta:
        model = Dataset
        fields = [
            'dataset_id',
            'name',
            'version',
            'description',
            'file_url',
            'row_count',
            'label_distribution',
            'validation_status',
            'validation_errors',
            'is_external_benchmark',
            'uploaded_by_email',
            'created_at',
            'updated_at',
        ]


class MLModelVersionSerializer(serializers.ModelSerializer):
    """
    Serializer representing an ML Model version with evaluation metrics.
    """
    model_version_id = serializers.UUIDField(source='id', read_only=True)

    class Meta:
        model = MLModelVersion
        fields = [
            'model_version_id',
            'version',
            'model_name',
            'vectorizer_name',
            'dataset_name',
            'dataset_size',
            'train_size',
            'test_size',
            'accuracy',
            'precision',
            'recall',
            'f1_score',
            'confusion_matrix',
            'evaluation_type',
            'is_active',
            'training_date',
            'notes',
        ]
