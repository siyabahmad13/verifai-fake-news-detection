import uuid
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedUUIDModel


class Prediction(TimeStampedUUIDModel):
    """
    Records an individual classification analysis performed by the ML Engine.
    Persists provenance, input text, model version, and probability vectors.
    """
    INPUT_TYPE_CHOICES = (
        ('text', 'Direct Text Ingestion'),
        ('url', 'Article URL Scrape'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='predictions',
        db_index=True,
        help_text="User who requested the prediction (null if anonymous)"
    )

    input_type = models.CharField(
        max_length=10,
        choices=INPUT_TYPE_CHOICES,
        default='text',
        db_index=True,
        help_text="Source modality of the submitted content"
    )

    url = models.URLField(
        max_length=1000,
        blank=True,
        help_text="Original source URL if submitted via URL modality"
    )

    headline = models.CharField(
        max_length=500,
        blank=True,
        help_text="Article title or breaking news claim headline"
    )

    input_text = models.TextField(
        help_text="Raw article content evaluated by the model"
    )

    prediction = models.CharField(
        max_length=20,
        db_index=True,
        help_text="Primary classification verdict (e.g. Real, Fake)"
    )

    confidence = models.FloatField(
        help_text="Statistical confidence probability percentage (0.0 to 100.0)"
    )

    probabilities = models.JSONField(
        default=dict,
        help_text="Complete class-wise probability distribution"
    )

    model_version = models.CharField(
        max_length=50,
        default='v1-baseline',
        db_index=True,
        help_text="Identifier of the ML model version that generated this prediction"
    )

    word_count = models.PositiveIntegerField(
        default=0,
        help_text="Word count of the analyzed content"
    )

    char_count = models.PositiveIntegerField(
        default=0,
        help_text="Character count of the analyzed content"
    )

    class Meta:
        db_table = 'verifai_predictions'
        verbose_name = 'Prediction Record'
        verbose_name_plural = 'Prediction Records'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['prediction', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.prediction}] {self.headline[:40] if self.headline else self.input_text[:40]} ({self.confidence}%)"
