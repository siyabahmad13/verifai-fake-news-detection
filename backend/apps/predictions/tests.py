import uuid
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User
from .models import Prediction


class PredictionAPITests(TestCase):
    """
    Automated test suite for Prediction APIs, URL verification,
    and history ownership/filtering permissions.
    """

    def setUp(self):
        self.client = APIClient()
        self.predict_text_url = reverse('predictions:predict_text')
        self.predict_url_url = reverse('predictions:predict_url')
        self.history_list_url = reverse('predictions:history_list')

        # Create two distinct test users to verify object-level privacy
        self.user1 = User.objects.create_user(
            email="researcher1@verifai.org",
            password="Password2026!Test",
            first_name="User",
            last_name="One"
        )
        self.user2 = User.objects.create_user(
            email="researcher2@verifai.org",
            password="Password2026!Test",
            first_name="User",
            last_name="Two"
        )

    def test_predict_text_anonymous(self):
        payload = {
            "text": "European Space Agency scientists confirmed the satellite launch from French Guiana early Thursday.",
            "headline": "Satellite Mission Update"
        }
        response = self.client.post(self.predict_text_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('prediction', response.data['data'])
        self.assertIn('confidence', response.data['data'])
        self.assertIn('disclaimer', response.data['data'])
        self.assertIn('prediction_id', response.data['data'])

        # Verify record exists in database unattached to any user
        pred_id = response.data['data']['prediction_id']
        record = Prediction.objects.get(id=pred_id)
        self.assertIsNone(record.user)

    def test_predict_text_authenticated(self):
        self.client.force_authenticate(user=self.user1)
        payload = {
            "text": "Secret miracle fuel pill eliminates oil completely according to leaked whistleblowers.",
            "headline": "Shocking Coverup"
        }
        response = self.client.post(self.predict_text_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        pred_id = response.data['data']['prediction_id']
        record = Prediction.objects.get(id=pred_id)
        self.assertEqual(record.user, self.user1)
        self.assertEqual(record.prediction, "Fake")

    def test_predict_text_invalid_short_content(self):
        payload = {"text": "Too short"}
        response = self.client.post(self.predict_text_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_predict_url_ssrf_protection(self):
        # Attempting to target localhost should fail validation immediately
        payload = {"url": "http://127.0.0.1:8000/internal-api"}
        response = self.client.post(self.predict_url_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_history_user_isolation(self):
        # Create prediction for User 1
        p1 = Prediction.objects.create(
            user=self.user1,
            headline="User 1 Article",
            input_text="Sample text for user 1 verification test.",
            prediction="Real",
            confidence=95.0
        )
        # Create prediction for User 2
        p2 = Prediction.objects.create(
            user=self.user2,
            headline="User 2 Article",
            input_text="Sample text for user 2 verification test.",
            prediction="Fake",
            confidence=91.0
        )

        # Authenticate as User 1
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.history_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data['data']['results']
        ids = [item['prediction_id'] for item in results]

        # User 1 MUST see their own prediction (p1)
        self.assertIn(str(p1.id), ids)
        # User 1 MUST NOT see User 2's prediction (p2)
        self.assertNotIn(str(p2.id), ids)

    def test_history_filtering_by_verdict(self):
        self.client.force_authenticate(user=self.user1)

        Prediction.objects.create(
            user=self.user1,
            headline="Genuine Report",
            input_text="Legitimate journalism verified content.",
            prediction="Real",
            confidence=94.0
        )
        Prediction.objects.create(
            user=self.user1,
            headline="Fabricated Post",
            input_text="Sensational conspiracy clickbait.",
            prediction="Fake",
            confidence=98.0
        )

        # Filter for Real only
        res_real = self.client.get(f"{self.history_list_url}?prediction=Real")
        self.assertEqual(res_real.status_code, status.HTTP_200_OK)
        for item in res_real.data['data']['results']:
            self.assertEqual(item['prediction'], "Real")

        # Filter for Fake only
        res_fake = self.client.get(f"{self.history_list_url}?prediction=Fake")
        self.assertEqual(res_fake.status_code, status.HTTP_200_OK)
        for item in res_fake.data['data']['results']:
            self.assertEqual(item['prediction'], "Fake")

    def test_history_detail_object_level_permission(self):
        # User 2 creates a record
        p2 = Prediction.objects.create(
            user=self.user2,
            headline="Private Audit",
            input_text="Sensitive claim evaluated by user 2.",
            prediction="Real",
            confidence=93.0
        )
        detail_url = reverse('predictions:history_detail', kwargs={'id': p2.id})

        # User 1 attempts to access User 2's detail record -> must be forbidden (403)
        self.client.force_authenticate(user=self.user1)
        res_forbidden = self.client.get(detail_url)
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # User 2 accesses their own record -> succeeds (200)
        self.client.force_authenticate(user=self.user2)
        res_allowed = self.client.get(detail_url)
        self.assertEqual(res_allowed.status_code, status.HTTP_200_OK)
        self.assertEqual(res_allowed.data['data']['headline'], "Private Audit")

    def test_history_delete_record(self):
        p1 = Prediction.objects.create(
            user=self.user1,
            headline="Record to Delete",
            input_text="Article text pending deletion.",
            prediction="Real",
            confidence=90.0
        )
        detail_url = reverse('predictions:history_detail', kwargs={'id': p1.id})

        # User 2 attempts to delete User 1's record -> fails 403
        self.client.force_authenticate(user=self.user2)
        res_delete_unauth = self.client.delete(detail_url)
        self.assertEqual(res_delete_unauth.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Prediction.objects.filter(id=p1.id).exists())

        # User 1 deletes their own record -> succeeds 200
        self.client.force_authenticate(user=self.user1)
        res_delete_auth = self.client.delete(detail_url)
        self.assertEqual(res_delete_auth.status_code, status.HTTP_200_OK)
        self.assertFalse(Prediction.objects.filter(id=p1.id).exists())
