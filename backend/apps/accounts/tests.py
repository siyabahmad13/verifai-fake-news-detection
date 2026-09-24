from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .models import User


class AuthenticationTests(TestCase):
    """
    Test suite for custom User authentication and JWT endpoints.
    """
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('auth:register')
        self.login_url = reverse('auth:login')
        self.refresh_url = reverse('auth:token_refresh')
        self.logout_url = reverse('auth:logout')
        self.profile_url = reverse('auth:profile')

        self.user_data = {
            "email": "researcher@verifai.org",
            "password": "StrongPassword2026!",
            "confirm_password": "StrongPassword2026!",
            "first_name": "Alan",
            "last_name": "Turing",
            "institution": "University Computing Lab",
            "role": "Lead Analyst"
        }

    def test_register_user_success(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('tokens', response.data['data'])
        self.assertIn('access', response.data['data']['tokens'])
        self.assertIn('refresh', response.data['data']['tokens'])
        self.assertEqual(response.data['data']['user']['email'], "researcher@verifai.org")
        self.assertEqual(response.data['data']['user']['first_name'], "Alan")

    def test_register_duplicate_email_fails(self):
        self.client.post(self.register_url, self.user_data, format='json')
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_register_mismatched_password_fails(self):
        bad_data = self.user_data.copy()
        bad_data['confirm_password'] = "DifferentPassword123!"
        response = self.client.post(self.register_url, bad_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_login_success(self):
        # Register first
        self.client.post(self.register_url, self.user_data, format='json')

        login_payload = {
            "email": "researcher@verifai.org",
            "password": "StrongPassword2026!"
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('access', response.data['data']['tokens'])
        self.assertIn('refresh', response.data['data']['tokens'])

    def test_login_invalid_password_fails(self):
        self.client.post(self.register_url, self.user_data, format='json')

        bad_payload = {
            "email": "researcher@verifai.org",
            "password": "WrongPassword!"
        }
        response = self.client.post(self.login_url, bad_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])

    def test_profile_authenticated_access(self):
        reg_res = self.client.post(self.register_url, self.user_data, format='json')
        access_token = reg_res.data['data']['tokens']['access']

        # Query without token
        unauth_res = self.client.get(self.profile_url)
        self.assertEqual(unauth_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Query with Bearer token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        auth_res = self.client.get(self.profile_url)
        self.assertEqual(auth_res.status_code, status.HTTP_200_OK)
        self.assertEqual(auth_res.data['data']['email'], "researcher@verifai.org")

    def test_profile_patch_update(self):
        reg_res = self.client.post(self.register_url, self.user_data, format='json')
        access_token = reg_res.data['data']['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        patch_payload = {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "institution": "Mathematical Computing Institute"
        }
        response = self.client.patch(self.profile_url, patch_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['first_name'], "Ada")
        self.assertEqual(response.data['data']['last_name'], "Lovelace")
        self.assertEqual(response.data['data']['institution'], "Mathematical Computing Institute")

    def test_token_refresh_and_logout_blacklisting(self):
        reg_res = self.client.post(self.register_url, self.user_data, format='json')
        tokens = reg_res.data['data']['tokens']
        refresh_token = tokens['refresh']
        access_token = tokens['access']

        # Refresh access token
        refresh_res = self.client.post(self.refresh_url, {"refresh": refresh_token}, format='json')
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        new_access = refresh_res.data['data']['access']
        new_refresh = refresh_res.data['data'].get('refresh', refresh_token)
        self.assertTrue(new_access)

        # Logout with active refresh token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access}')
        logout_res = self.client.post(self.logout_url, {"refresh": new_refresh}, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Attempting to use the blacklisted refresh token must now fail
        blacklisted_res = self.client.post(self.refresh_url, {"refresh": new_refresh}, format='json')
        self.assertEqual(blacklisted_res.status_code, status.HTTP_401_UNAUTHORIZED)
