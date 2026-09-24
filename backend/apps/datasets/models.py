from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import TimeStampedUUIDModel


class Dataset(TimeStampedUUIDModel):
    """
    Registry for news training and evaluation datasets.
    Stores validation metrics, class distribution, and file reference.
    """
    VALIDATION_STATUS_CHOICES = (
        ('pending', 'Pending Ingestion Validation'),
        ('valid', 'Validated / Approved for Training'),
        ('invalid', 'Validation Failed / Corrupt Data'),
    )

    name = models.CharField(
        max_length=200,
        help_text="Dataset name (e.g. ISOT Benchmark, WELFake Combined Corpus)"
    )
    version = models.CharField(
        max_length=50,
        default="1.0",
        help_text="Semantic dataset version"
    )
    description = models.TextField(
        blank=True,
        help_text="Domain, time period, publisher distribution, and provenance notes"
    )
    file = models.FileField(
        upload_to='datasets/%Y/%m/',
        help_text="CSV or XLSX dataset file"
    )

    row_count = models.PositiveIntegerField(
        default=0,
        help_text="Total validated rows in the dataset"
    )
    label_distribution = models.JSONField(
        default=dict,
        help_text="Class counts (e.g. {'Real': 21417, 'Fake': 23481})"
    )
    validation_status = models.CharField(
        max_length=20,
        choices=VALIDATION_STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    validation_errors = models.JSONField(
        default=list,
        help_text="List of validation warnings or structural error messages"
    )
    is_external_benchmark = models.BooleanField(
        default=False,
        help_text="Designates this dataset as an external unseen benchmark test set"
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_datasets'
    )

    class Meta:
        db_table = 'verifai_datasets'
        verbose_name = 'Dataset Registry'
        verbose_name_plural = 'Dataset Registries'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} (v{self.version}) — {self.row_count} rows [{self.validation_status}]"


class MLModelVersion(TimeStampedUUIDModel):
    """
    Formal model version registry tracking architecture, training corpora,
    hyperparameters, offline evaluation metrics, and active production status.
    """
    version = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique model version tag (e.g. v1-baseline, v2-svm-balanced)"
    )
    model_name = models.CharField(
        max_length=100,
        default='LogisticRegression',
        help_text="Classifier algorithm name"
    )
    vectorizer_name = models.CharField(
        max_length=100,
        default='TfidfVectorizer',
        help_text="Feature extraction algorithm"
    )

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trained_models',
        help_text="Training dataset instance used for fitting"
    )
    dataset_name = models.CharField(
        max_length=200,
        default='ISOT Fake News Dataset',
        help_text="Name of dataset used for training"
    )

    dataset_size = models.PositiveIntegerField(default=44898)
    train_size = models.PositiveIntegerField(default=35918)
    test_size = models.PositiveIntegerField(default=8980)

    # Evaluation Metrics on Test Split
    accuracy = models.FloatField(default=0.0, help_text="Test set accuracy (0.0 to 1.0)")
    precision = models.FloatField(default=0.0, help_text="Test set precision (0.0 to 1.0)")
    recall = models.FloatField(default=0.0, help_text="Test set recall (0.0 to 1.0)")
    f1_score = models.FloatField(default=0.0, help_text="Test set F1-Score (0.0 to 1.0)")
    confusion_matrix = models.JSONField(
        default=list,
        help_text="Confusion matrix 2x2 [[TP, FP], [FN, TN]]"
    )

    evaluation_type = models.CharField(
        max_length=50,
        default='random_heldout_split',
        help_text="Method of evaluation (e.g. random_heldout_split vs external_unseen_corpus)"
    )

    # File Paths to Model Artifacts
    model_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Relative or absolute path to classifier artifact file"
    )
    vectorizer_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Relative or absolute path to vectorizer artifact file"
    )

    is_active = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Designates this model as the active production prediction engine"
    )

    training_date = models.DateTimeField(
        default=timezone.now,
        help_text="Timestamp when training was executed"
    )
    notes = models.TextField(
        blank=True,
        help_text="Observations, hyperparameter changes, or generalization findings"
    )

    class Meta:
        db_table = 'verifai_model_versions'
        verbose_name = 'ML Model Version'
        verbose_name_plural = 'ML Model Versions'
        ordering = ['-training_date']

    def __str__(self):
        active_flag = " [ACTIVE]" if self.is_active else ""
        return f"{self.version}: {self.model_name} (Acc: {self.accuracy*100:.1f}%, F1: {self.f1_score:.3f}){active_flag}"

    def activate(self):
        """
        Activates this model version in the database and hot-swaps
        it inside the running ModelLoader singleton.
        """
        # Deactivate other versions
        MLModelVersion.objects.exclude(id=self.id).update(is_active=False)
        self.is_active = True
        self.save()

        # Hot-swap artifacts in ModelLoader if paths are specified
        if self.model_path and self.vectorizer_path:
            from apps.ml_engine.model_loader import model_loader
            model_loader.reload(
                model_path=self.model_path,
                vectorizer_path=self.vectorizer_path,
                version=self.version
            )
