import io
import tempfile
import pandas as pd
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from .models import Dataset, MLModelVersion
from .validator import validate_dataset_file
from .training_service import ModelTrainingService


class DatasetAndRetrainingTests(TestCase):
    """
    Automated test suite for dataset ingestion, integrity validation,
    offline retraining pipeline, and model versioning.
    """

    def setUp(self):
        self.client = APIClient()
        self.upload_url = reverse('datasets:dataset_upload')
        self.list_url = reverse('datasets:dataset_list')
        self.model_list_url = reverse('datasets:model_version_list')

        # Admin user
        self.admin = User.objects.create_superuser(
            email="admin@verifai.org",
            password="AdminPassword2026!",
            first_name="Admin",
            last_name="User"
        )
        # Regular researcher user
        self.user = User.objects.create_user(
            email="researcher@verifai.org",
            password="UserPassword2026!",
            first_name="Jane",
            last_name="Goodall"
        )

        # Create a sample valid CSV buffer
        self.csv_content = (
            "title,text,label\n"
            "Space Mission,European Space Agency launched observation satellite into orbit,Real\n"
            "Trade Deal,Delegates met in Geneva to negotiate international agricultural tariffs,Real\n"
            "Miracle Fuel,Anonymous insider leaks perpetual energy pill banned by Big Oil,Fake\n"
            "Secret Bunker,Government experiments secretly replace currency with microchips,Fake\n"
            "Medical Study,Clinical trials demonstrate efficacy of antibody treatment for asthma,Real\n"
            "Outrageous Scam,Secret trick doctors do not want anyone to know about overnight,Fake\n"
        ).encode('utf-8')

    def test_dataset_validator_success(self):
        file_obj = io.BytesIO(self.csv_content)
        file_obj.name = "sample_news.csv"
        report = validate_dataset_file(file_obj)

        self.assertTrue(report['is_valid'])
        self.assertEqual(report['row_count'], 6)
        self.assertIn('Real', report['label_distribution'])
        self.assertIn('Fake', report['label_distribution'])

    def test_dataset_validator_missing_columns(self):
        bad_csv = (
            "id,author,timestamp\n"
            + "\n".join([f"{i},Author_{i},2026-01-01" for i in range(6)])
        ).encode('utf-8')
        file_obj = io.BytesIO(bad_csv)
        file_obj.name = "bad_schema.csv"
        report = validate_dataset_file(file_obj)

        self.assertFalse(report['is_valid'])
        self.assertTrue(any("Missing required" in err for err in report['errors']))

    def test_admin_dataset_upload_success(self):
        self.client.force_authenticate(user=self.admin)
        uploaded_file = SimpleUploadedFile(
            "sample_corpus.csv",
            self.csv_content,
            content_type="text/csv"
        )

        payload = {
            "name": "Unit Test Corpus",
            "version": "1.0",
            "description": "Miniature training dataset for unit tests",
            "file": uploaded_file
        }
        response = self.client.post(self.upload_url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['name'], "Unit Test Corpus")
        self.assertEqual(response.data['data']['validation_status'], "valid")

    def test_unauthorized_dataset_upload_fails(self):
        # Regular non-staff user attempts upload
        self.client.force_authenticate(user=self.user)
        uploaded_file = SimpleUploadedFile(
            "sample_corpus.csv",
            self.csv_content,
            content_type="text/csv"
        )
        response = self.client.post(self.upload_url, {"name": "Test", "file": uploaded_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_model_version_listing(self):
        MLModelVersion.objects.create(
            version="v1-baseline",
            model_name="Logistic Regression",
            accuracy=0.986,
            is_active=True
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.model_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

        # Verify v1-baseline is present in list
        versions = [item['version'] for item in response.data['data']['results']]
        self.assertIn('v1-baseline', versions)

    def test_model_version_activation_permissions(self):
        mv = MLModelVersion.objects.create(
            version="v2-test-candidate",
            model_name="Linear SVM",
            accuracy=0.95,
            is_active=False
        )
        activate_url = reverse('datasets:model_version_activate', kwargs={'id': mv.id})

        # Regular user fails 403
        self.client.force_authenticate(user=self.user)
        res_user = self.client.post(activate_url)
        self.assertEqual(res_user.status_code, status.HTTP_403_FORBIDDEN)

        # Admin activates successfully
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.post(activate_url)
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        mv.refresh_from_db()
        self.assertTrue(mv.is_active)

    def test_end_to_end_retraining_service(self):
        # Create dataset instance with sufficient samples for train/test split
        extended_csv = (
            "title,text,label\n"
            + "\n".join([
                f"Wire Report {i},European space agency confirms research satellite launch in orbit {i},Real"
                for i in range(15)
            ])
            + "\n"
            + "\n".join([
                f"Clickbait Conspiracy {i},Secret miracle pill banned by oil barons suppresses energy {i},Fake"
                for i in range(15)
            ])
        ).encode('utf-8')

        uploaded_file = SimpleUploadedFile(
            "retrain_corpus.csv",
            extended_csv,
            content_type="text/csv"
        )
        dataset = Dataset.objects.create(
            name="Retrain Test Corpus",
            version="1.0",
            file=uploaded_file,
            validation_status="valid",
            row_count=30
        )

        # Run ModelTrainingService
        trainer = ModelTrainingService(
            dataset=dataset,
            version_tag="v_test_retrain",
            model_type="logreg",
            max_features=1000,
            notes="Automated test retraining run"
        )
        new_model_version = trainer.train(auto_activate=False)

        self.assertIsInstance(new_model_version, MLModelVersion)
        self.assertEqual(new_model_version.version, "v_test_retrain")
        self.assertGreaterEqual(new_model_version.accuracy, 0.5)
        self.assertTrue(new_model_version.model_path)
        self.assertTrue(new_model_version.vectorizer_path)
        self.assertFalse(new_model_version.is_active)  # Retains admin approval gate
