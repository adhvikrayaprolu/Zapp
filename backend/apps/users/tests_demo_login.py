from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.users.models import User, UserRawExplicit

DEMO_URL = "/api/auth/demo-login/"


@override_settings(DEBUG=True, DEMO_LOGIN_ENABLED=True, DEMO_LOGIN_USERNAME="demo_user_0")
class DemoLoginTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="demo_user_0", email="demo_user_0@example.com", password=None
        )

    def test_get_reports_enabled(self):
        resp = self.client.get(DEMO_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["enabled"])

    @override_settings(SUPABASE_URL="")
    def test_get_reports_password_login_availability(self):
        self.assertFalse(self.client.get(DEMO_URL).json()["password_login_configured"])
        with self.settings(SUPABASE_URL="https://example.supabase.co"):
            self.assertTrue(self.client.get(DEMO_URL).json()["password_login_configured"])

    def test_post_issues_fully_verified_session(self):
        resp = self.client.post(DEMO_URL)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["user"]["username"], "demo_user_0")
        self.assertEqual(body["aal"], "aal2")
        self.assertFalse(body["mfa_pending"])

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["username"], "demo_user_0")
        self.assertFalse(me.json()["mfa_pending"])

    def test_status_checks_do_not_consume_the_login_limit(self):
        for _ in range(10):
            self.assertEqual(self.client.get(DEMO_URL).status_code, 200)
        self.assertEqual(self.client.post(DEMO_URL).status_code, 200)

    def test_sign_in_attempts_are_rate_limited(self):
        codes = [self.client.post(DEMO_URL).status_code for _ in range(8)]
        self.assertIn(429, codes)

    def test_mfa_snapshot_reports_session_assurance(self):
        self.client.post(DEMO_URL)
        resp = self.client.get("/api/auth/mfa/snapshot/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"current_level": "aal2", "next_level": None, "factors": []})

    def test_routes_to_onboarding_until_completed(self):
        self.assertEqual(self.client.post(DEMO_URL).json()["next_step"], "onboarding_survey")

        UserRawExplicit.objects.create(user=self.user)
        self.assertEqual(self.client.post(DEMO_URL).json()["next_step"], "dashboard")

    def test_missing_demo_user_returns_404(self):
        self.user.delete()
        resp = self.client.post(DEMO_URL)
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()["error_code"], "demo_user_missing")

    @override_settings(DEBUG=False)
    def test_disabled_outside_debug(self):
        self.assertFalse(self.client.get(DEMO_URL).json()["enabled"])
        resp = self.client.post(DEMO_URL)
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)

    @override_settings(DEMO_LOGIN_ENABLED=False)
    def test_disabled_by_flag(self):
        self.assertEqual(self.client.post(DEMO_URL).status_code, 404)


class SessionStatusTests(TestCase):
    def test_anonymous_is_not_authenticated(self):
        resp = APIClient().get("/api/auth/session/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"authenticated": False})

    @override_settings(DEBUG=True, DEMO_LOGIN_ENABLED=True, DEMO_LOGIN_USERNAME="demo_user_0")
    def test_signed_in_session_is_authenticated(self):
        cache.clear()
        User.objects.create_user(username="demo_user_0", email="demo@example.com", password=None)
        client = APIClient()
        client.post(DEMO_URL)
        self.assertEqual(client.get("/api/auth/session/").json(), {"authenticated": True})
