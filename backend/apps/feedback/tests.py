import uuid
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.predictions.models import Prediction
from .models import Feedback


class FeedbackAPITests(TestCase):
    """
    Automated test suite for Human-in-the-Loop Feedback:
    creation, ownership privacy, and admin review workflows.
    """

    def setUp(self):
        self.client = APIClient()
        self.feedback_url = reverse('feedback:feedback_list_create')

        # Regular Researcher User
        self.user = User.objects.create_user(
            email="analyst@verifai.org",
            password="StrongPassword2026!",
            first_name="Ada",
            last_name="Lovelace"
        )

        # Other User for isolation tests
        self.other_user = User.objects.create_user(
            email="other@verifai.org",
            password="StrongPassword2026!",
            first_name="Charles",
            last_name="Babbage"
        )

        # Admin / Staff User
        self.admin_user = User.objects.create_superuser(
            email="admin@verifai.org",
            password="AdminPassword2026!",
            first_name="System",
            last_name="Admin"
        )

        # Create a sample prediction to flag
        self.prediction = Prediction.objects.create(
            user=self.user,
            headline="Contested Wire Report",
            input_text="Sample text incorrectly flagged by the baseline classifier.",
            prediction="Fake",
            confidence=89.5
        )

    def test_submit_feedback_authenticated(self):
        self.client.force_authenticate(user=self.user)

        payload = {
            "prediction_id": str(self.prediction.id),
            "actual_label": "Real",
            "comment": "This article was published by Associated Press with named sources."
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('feedback_id', response.data['data'])
        self.assertEqual(response.data['data']['predicted_label'], "Fake")
        self.assertEqual(response.data['data']['actual_label'], "Real")
        self.assertEqual(response.data['data']['status'], "pending")

    def test_submit_feedback_unauthenticated_fails(self):
        payload = {
            "prediction_id": str(self.prediction.id),
            "actual_label": "Real",
            "comment": "This is legitimate journalism."
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_submit_feedback_invalid_prediction_id(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "prediction_id": str(uuid.uuid4()),
            "actual_label": "Real",
            "comment": "Non-existent prediction ID test."
        }
        response = self.client.post(self.feedback_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_feedback_ownership_isolation(self):
        # User creates feedback
        fb = Feedback.objects.create(
            user=self.user,
            prediction=self.prediction,
            predicted_label="Fake",
            actual_label="Real",
            comment="Detailed user feedback note."
        )

        # User sees their feedback
        self.client.force_authenticate(user=self.user)
        res_user = self.client.get(self.feedback_url)
        self.assertEqual(res_user.status_code, status.HTTP_200_OK)
        ids = [item['feedback_id'] for item in res_user.data['data']['results']]
        self.assertIn(str(fb.id), ids)

        # Other user does not see User's feedback
        self.client.force_authenticate(user=self.other_user)
        res_other = self.client.get(self.feedback_url)
        self.assertEqual(res_other.status_code, status.HTTP_200_OK)
        other_ids = [item['feedback_id'] for item in res_other.data['data']['results']]
        self.assertNotIn(str(fb.id), other_ids)

    def test_admin_review_workflow(self):
        fb = Feedback.objects.create(
            user=self.user,
            prediction=self.prediction,
            predicted_label="Fake",
            actual_label="Real",
            comment="False positive report."
        )
        review_url = reverse('feedback:feedback_review', kwargs={'id': fb.id})

        # Regular user attempting review -> Forbidden (403)
        self.client.force_authenticate(user=self.user)
        res_unauth = self.client.patch(review_url, {"status": "approved"}, format='json')
        self.assertEqual(res_unauth.status_code, status.HTTP_403_FORBIDDEN)

        # Admin user reviews and approves -> Success (200)
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "status": "approved",
            "admin_notes": "Confirmed valid Reuters article. Queued for next retraining batch."
        }
        res_admin = self.client.patch(review_url, payload, format='json')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(res_admin.data['data']['status'], "approved")
        self.assertEqual(res_admin.data['data']['reviewer_email'], self.admin_user.email)
        self.assertIsNotNone(res_admin.data['data']['reviewed_at'])
