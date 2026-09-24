"""
Django Management Command: train_model
Usage:
    python manage.py train_model --dataset-id <uuid> --version <tag> [--model-type logreg|svm|naive_bayes] [--activate]
"""

from django.core.management.base import BaseCommand, CommandError
from apps.datasets.models import Dataset, MLModelVersion
from apps.datasets.training_service import ModelTrainingService


class Command(BaseCommand):
    help = 'Executes controlled offline retraining on an uploaded news dataset.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dataset-id',
            type=str,
            required=True,
            help='UUID of the validated Dataset record to train on'
        )
        parser.add_argument(
            '--version',
            type=str,
            required=True,
            help='Unique version identifier (e.g. v2-svm-balanced, v3-isot-augmented)'
        )
        parser.add_argument(
            '--model-type',
            type=str,
            default='logreg',
            choices=['logreg', 'svm', 'naive_bayes'],
            help='Machine learning algorithm to train (default: logreg)'
        )
        parser.add_argument(
            '--max-features',
            type=int,
            default=50000,
            help='Maximum n-gram features for TF-IDF vectorizer (default: 50000)'
        )
        parser.add_argument(
            '--activate',
            action='store_true',
            help='Immediately activate this model version for production inference'
        )
        parser.add_argument(
            '--notes',
            type=str,
            default='',
            help='Optional notes describing hyperparameters or experiment intent'
        )

    def handle(self, *args, **options):
        dataset_id = options['dataset_id']
        version = options['version']
        model_type = options['model_type']
        max_features = options['max_features']
        activate = options['activate']
        notes = options['notes']

        # 1. Fetch Dataset
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            raise CommandError(f"Dataset with ID '{dataset_id}' does not exist.")

        # Check for existing version tag
        if MLModelVersion.objects.filter(version=version).exists():
            raise CommandError(f"Model version '{version}' already exists. Please choose a new version tag.")

        self.stdout.write(self.style.NOTICE(
            f"Initializing retraining pipeline on dataset '{dataset.name}' with algorithm '{model_type}'..."
        ))

        # 2. Run Training Service
        try:
            trainer = ModelTrainingService(
                dataset=dataset,
                version_tag=version,
                model_type=model_type,
                max_features=max_features,
                notes=notes
            )
            model_version = trainer.train(auto_activate=activate)

            self.stdout.write(self.style.SUCCESS(
                f"\nSuccessfully trained model version '{model_version.version}'!\n"
                f"  Algorithm: {model_version.model_name}\n"
                f"  Dataset: {model_version.dataset_name} ({model_version.dataset_size:,} records)\n"
                f"  Test Accuracy: {model_version.accuracy*100:.2f}%\n"
                f"  Test Precision: {model_version.precision*100:.2f}%\n"
                f"  Test Recall: {model_version.recall*100:.2f}%\n"
                f"  Test F1-Score: {model_version.f1_score:.4f}\n"
                f"  Artifacts saved to: {model_version.model_path}\n"
                f"  Active in Production: {'YES' if model_version.is_active else 'NO (Requires admin approval)'}\n"
            ))

        except Exception as e:
            raise CommandError(f"Retraining failed: {str(e)}")
