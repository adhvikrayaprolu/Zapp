from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.auth_views import _has_completed_onboarding
from apps.users.models import User, UserRawExplicit


class OnboardingSkipTests(TestCase):
    """'Skip for now' saves an empty profile so onboarding stops gating the dashboard."""

    def setUp(self):
        self.user = User.objects.create_user(username="newbie", password="pw")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_empty_profile_is_accepted_and_completes_onboarding(self):
        self.assertFalse(_has_completed_onboarding(self.user))

        resp = self.client.post("/api/raw-explicit/", {}, format="json")

        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertTrue(_has_completed_onboarding(self.user))
        profile = UserRawExplicit.objects.get(user=self.user)
        self.assertEqual(profile.life_stage, "")
        self.assertIsNone(profile.value_priority_cost)
