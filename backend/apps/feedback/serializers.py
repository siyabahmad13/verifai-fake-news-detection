from rest_framework import serializers
from apps.predictions.models import Prediction
from .models import Feedback


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting discrepancy feedback on an existing prediction.
    """
    prediction_id = serializers.UUIDField(
        write_only=True,
        required=True,
        help_text="UUID of the prediction record to flag"
    )

    class Meta:
        model = Feedback
        fields = [
            'prediction_id',
            'actual_label',
            'comment',
        ]

    def validate_prediction_id(self, value):
        try:
            prediction = Prediction.objects.get(id=value)
        except Prediction.DoesNotExist:
            raise serializers.ValidationError("Prediction record not found.")
        self.prediction_instance = prediction
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        prediction = self.prediction_instance

        feedback = Feedback.objects.create(
            user=user,
            prediction=prediction,
            predicted_label=prediction.prediction,
            actual_label=validated_data['actual_label'],
            comment=validated_data['comment']
        )
        return feedback


class FeedbackListSerializer(serializers.ModelSerializer):
    """
    Serializer for list view of user feedback submissions.
    """
    feedback_id = serializers.UUIDField(source='id', read_only=True)
    prediction_headline = serializers.CharField(source='prediction.headline', read_only=True)

    class Meta:
        model = Feedback
        fields = [
            'feedback_id',
            'prediction_id',
            'prediction_headline',
            'predicted_label',
            'actual_label',
            'status',
            'comment',
            'created_at',
        ]


class FeedbackDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive view of a feedback record including review metadata.
    """
    feedback_id = serializers.UUIDField(source='id', read_only=True)
    reviewer_email = serializers.EmailField(source='reviewed_by.email', read_only=True)
    prediction_headline = serializers.CharField(source='prediction.headline', read_only=True)
    prediction_input = serializers.CharField(source='prediction.input_text', read_only=True)

    class Meta:
        model = Feedback
        fields = [
            'feedback_id',
            'prediction_id',
            'prediction_headline',
            'prediction_input',
            'predicted_label',
            'actual_label',
            'comment',
            'status',
            'reviewed_at',
            'reviewer_email',
            'admin_notes',
            'created_at',
            'updated_at',
        ]


class FeedbackReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for staff/admin review action.
    """
    status = serializers.ChoiceField(
        choices=['approved', 'rejected', 'under_review'],
        required=True
    )
    admin_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default=""
    )

    class Meta:
        model = Feedback
        fields = ['status', 'admin_notes']
