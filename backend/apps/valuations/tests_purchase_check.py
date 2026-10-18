from datetime import datetime, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.transactions.models import Transaction, TransactionCategory
from apps.users.models import User
from apps.valuations.services.purchase_check import (
    check_purchase,
    estimate_score_from_ratings,
    transaction_value_score,
)

NOW = timezone.make_aware(datetime(2026, 10, 18, 12, 0))


class PurchaseCheckServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="buyer", password="pw")

    def spend(self, amount, days_ago, category=TransactionCategory.SHOPPING, **fields):
        return Transaction.objects.create(
            user=self.user,
            direction="spend",
            amount=Decimal(str(amount)),
            occurred_at=NOW - timedelta(days=days_ago),
            category=category,
            **fields,
        )

    def test_rating_estimate_matches_frontend_calibration(self):
        self.assertEqual(estimate_score_from_ratings(7, 0, 0), 110)
        self.assertEqual(estimate_score_from_ratings(5, 0, 0), 83)
        self.assertEqual(estimate_score_from_ratings(7, 0.4, 0.4), 86)
        self.assertIsNone(estimate_score_from_ratings(None, None, None))

    def test_score_precedence_model_then_feedback_then_ratings(self):
        tx = self.spend(10, 1, personal_value_score=120, feedback_value_score=0.2, satisfaction_rating=1)
        self.assertEqual(transaction_value_score(tx), 120)
        tx = self.spend(10, 1, feedback_value_score=0.6, satisfaction_rating=1)
        self.assertEqual(transaction_value_score(tx), 90)
        tx = self.spend(10, 1, satisfaction_rating=7)
        self.assertEqual(transaction_value_score(tx), 110)

    def test_no_history_starts_neutral_and_buys(self):
        result = check_purchase(self.user, amount=Decimal("40"), category="shopping", now=NOW)
        self.assertEqual(result["score"], 100)
        self.assertEqual(result["verdict"], "buy")
        self.assertIn("no rated shopping purchases", result["reasons"][0])

    def test_well_rated_category_within_budget_buys(self):
        for days in (40, 45, 70, 75):
            self.spend(50, days, personal_value_score=120)
        result = check_purchase(self.user, amount=Decimal("45"), category="shopping", now=NOW)
        self.assertEqual(result["score"], 120)
        self.assertEqual(result["verdict"], "buy")
        self.assertEqual(result["stats"]["history_score"], 120)

    def test_expensive_purchase_over_monthly_pace_is_skipped(self):
        for days in (40, 45, 70, 75):
            self.spend(50, days, personal_value_score=95)
        result = check_purchase(self.user, amount=Decimal("600"), category="shopping", now=NOW)
        kinds = {a["kind"] for a in result["adjustments"]}
        self.assertIn("over_monthly_pace", kinds)
        self.assertIn("far_above_typical_price", kinds)
        self.assertEqual(result["verdict"], "skip")

    def test_recent_frequency_penalty(self):
        for days in (1, 2, 3):
            self.spend(20, days, category=TransactionCategory.EATING_OUT, personal_value_score=100)
        result = check_purchase(self.user, amount=Decimal("20"), category="eating_out", now=NOW)
        self.assertIn("recent_frequency", {a["kind"] for a in result["adjustments"]})

    def test_ignores_other_users_and_categories(self):
        other = User.objects.create_user(username="other", password="pw")
        Transaction.objects.create(
            user=other, direction="spend", amount=Decimal("5"), occurred_at=NOW, category="shopping",
            personal_value_score=10,
        )
        self.spend(30, 5, category=TransactionCategory.GROCERIES, personal_value_score=10)
        result = check_purchase(self.user, amount=Decimal("40"), category="shopping", now=NOW)
        self.assertEqual(result["stats"]["category_purchases"], 0)


class PurchaseCheckApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="buyer", password="pw")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_returns_verdict(self):
        resp = self.client.post(
            "/api/purchase-check/", {"item": "Headphones", "amount": "79.99", "category": "shopping"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["item"], "Headphones")
        self.assertIn(body["verdict"], {"buy", "wait", "skip"})
        self.assertTrue(body["reasons"])

    def test_validates_input(self):
        resp = self.client.post("/api/purchase-check/", {"amount": "-5", "category": "spaceships"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("amount", resp.json())
        self.assertIn("category", resp.json())

    def test_requires_authentication(self):
        resp = APIClient().post("/api/purchase-check/", {"amount": "5", "category": "shopping"}, format="json")
        self.assertIn(resp.status_code, (401, 403))
