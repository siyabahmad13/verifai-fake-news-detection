import uuid
from django.db import models


class TimeStampedUUIDModel(models.Model):
    """
    Abstract base model that uses UUID as primary key and provides
    self-updating created_at and updated_at timestamp fields.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when record was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when record was last updated"
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']
