from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Prediction

DISCLAIMER_TEXT = (
    "Model confidence represents statistical similarity to training patterns and not "
    "definitive proof of objective truth. Automated predictions should be used as "
    "decision-support alongside verified journalistic fact-checking."
)


class TextPredictionInputSerializer(serializers.Serializer):
    """
    Input serializer for direct text prediction.
    """
    text = serializers.CharField(
        required=True,
        min_length=15,
        max_length=50000,
        help_text="News article body text or statement excerpt (15 - 50,000 chars)"
    )
    headline = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        default="",
        help_text="Optional article title or claim headline"
    )


class UrlPredictionInputSerializer(serializers.Serializer):
    """
    Input serializer for URL-based news verification.
    """
    url = serializers.URLField(
        required=True,
        max_length=1000,
        help_text="Public HTTP or HTTPS URL of the news article to scrape and verify"
    )


class PredictionResponseSerializer(serializers.ModelSerializer):
    """
    Standard output serializer for prediction results.
    """
    prediction_id = serializers.UUIDField(source='id', read_only=True)
    disclaimer = serializers.SerializerMethodField()

    class Meta:
        model = Prediction
        fields = [
            'prediction_id',
            'prediction',
            'confidence',
            'probabilities',
            'model_version',
            'headline',
            'input_type',
            'url',
            'word_count',
            'char_count',
            'disclaimer',
            'created_at',
        ]

    @extend_schema_field(str)
    def get_disclaimer(self, obj):
        return DISCLAIMER_TEXT


class PredictionHistoryListSerializer(serializers.ModelSerializer):
    """
    Condensed serializer for tabular history listing.
    """
    prediction_id = serializers.UUIDField(source='id', read_only=True)

    class Meta:
        model = Prediction
        fields = [
            'prediction_id',
            'headline',
            'input_type',
            'prediction',
            'confidence',
            'model_version',
            'word_count',
            'created_at',
        ]


class PredictionHistoryDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for viewing complete prediction record including raw text.
    """
    prediction_id = serializers.UUIDField(source='id', read_only=True)
    disclaimer = serializers.SerializerMethodField()

    class Meta:
        model = Prediction
        fields = [
            'prediction_id',
            'input_type',
            'url',
            'headline',
            'input_text',
            'prediction',
            'confidence',
            'probabilities',
            'model_version',
            'word_count',
            'char_count',
            'disclaimer',
            'created_at',
            'updated_at',
        ]

    @extend_schema_field(str)
    def get_disclaimer(self, obj):
        return DISCLAIMER_TEXT
