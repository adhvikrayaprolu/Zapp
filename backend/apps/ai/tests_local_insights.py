from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.ai.local_insights import (
    _guess_category,
    _guess_item,
    _parse_amount,
    build_local_insight_response,
)
from apps.ai.views import _monthly_subscription_cost
from apps.subscriptions.models import BillingCycle, Merchant, Subscription, SubscriptionStatus
from apps.transactions.models import Transaction, TransactionCategory
from apps.users.models import User
from apps.valuations.models import SubscriptionValuation, ValuationModelVersion


class ParsingTests(TestCase):
    def test_amounts_items_and_categories(self):
        self.assertEqual(_parse_amount("should I buy it for $1,299.50?"), Decimal("1299.50"))
        self.assertEqual(_parse_amount("about 40 dollars"), Decimal("40"))
        self.assertIsNone(_parse_amount("should I buy it?"))
        self.assertEqual(_guess_item("Should I buy wireless headphones for $199?"), "wireless headphones")
        self.assertEqual(_guess_item("is it worth getting concert tickets for $180"), "concert tickets")
        self.assertEqual(_guess_category("concert tickets"), TransactionCategory.ENTERTAINMENT)
        self.assertEqual(_guess_category("dinner at a sushi place"), TransactionCategory.EATING_OUT)
        self.assertEqual(_guess_category("a new widget"), TransactionCategory.SHOPPING)


class LocalInsightTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="saver", password="pw")
        self.now = timezone.now()

    def spend(self, amount, days_ago, category=TransactionCategory.SHOPPING, **fields):
        return Transaction.objects.create(
            user=self.user,
            direction="spend",
            amount=Decimal(str(amount)),
            occurred_at=self.now - timedelta(days=days_ago),
            category=category,
            **fields,
        )

    def ask(self, question, financial_context=None):
        return build_local_insight_response(self.user, question, financial_context or {})

    def test_purchase_question_runs_purchase_check(self):
        for days in (40, 70, 100):
            self.spend(30, days, personal_value_score=120)
        reply = self.ask("Should I buy wireless headphones for $45?")
        self.assertEqual(reply["insight_topic"], "purchase")
        self.assertIn("wireless headphones", reply["assistant_text"])
        self.assertIn("/150", reply["assistant_text"])

    def test_purchase_question_without_price_asks_for_one(self):
        reply = self.ask("Should I buy a new jacket?")
        self.assertEqual(reply["insight_topic"], "purchase_needs_amount")
        self.assertIn("how much", reply["assistant_text"].lower())

    def test_subscription_question_names_lowest_value(self):
        model_version = ValuationModelVersion.objects.create(name="value_score", version="test")
        for name, score in (("Gym Co", 40), ("Music Co", 130)):
            merchant = Merchant.objects.create(name=name)
            sub = Subscription.objects.create(
                user=self.user, merchant=merchant, status=SubscriptionStatus.ACTIVE,
                billing_cycle=BillingCycle.MONTHLY, price=Decimal("10.00"), currency="USD",
            )
            SubscriptionValuation.objects.create(
                user=self.user, subscription=sub, model_version=model_version, personal_value_score=score,
                period_start=self.now.date() - timedelta(days=30), period_end=self.now.date(),
                total_cost=Decimal("10"), estimated_value=Decimal("10"), net_value=Decimal("0"),
            )
        reply = self.ask("Which subscription should I cancel?")
        self.assertEqual(reply["insight_topic"], "subscriptions")
        self.assertIn("lowest-value subscription is Gym Co", reply["assistant_text"])
        self.assertIn("best is Music Co", reply["assistant_text"])

    def test_value_overview_reports_average_and_categories(self):
        for days in (1, 2, 3):
            self.spend(10, days, category=TransactionCategory.GROCERIES, personal_value_score=130)
            self.spend(10, days, category=TransactionCategory.EATING_OUT, personal_value_score=60)
        reply = self.ask("How am I doing with my value scores?")
        self.assertEqual(reply["insight_topic"], "value_overview")
        self.assertIn("most value from groceries", reply["assistant_text"])
        self.assertIn("least from eating out", reply["assistant_text"])

    def test_savings_flags_low_value_categories(self):
        for days in (1, 2, 3):
            self.spend(15, days, category=TransactionCategory.EATING_OUT, personal_value_score=50)
        reply = self.ask("Where can I cut back?")
        self.assertEqual(reply["insight_topic"], "savings")
        self.assertIn("eating out", reply["assistant_text"])

    def test_unrelated_question_gets_overview_with_examples(self):
        reply = self.ask(
            "What's the weather?",
            {"summary": {"spend_month_to_date": "42.00", "spend_transaction_count_month_to_date": 3}},
        )
        self.assertEqual(reply["insight_topic"], "overview")
        self.assertIn("$42.00 across 3 purchases", reply["assistant_text"])
        self.assertNotIn("OpenAI", reply["assistant_text"])


class MonthlySubscriptionCostTests(TestCase):
    def test_other_billing_cycle_counts_as_monthly(self):
        sub = Subscription(price=Decimal("12.00"), billing_cycle=BillingCycle.OTHER)
        self.assertEqual(_monthly_subscription_cost(sub), Decimal("12.00"))

    def test_yearly_is_prorated(self):
        sub = Subscription(price=Decimal("120.00"), billing_cycle=BillingCycle.YEARLY)
        self.assertAlmostEqual(float(_monthly_subscription_cost(sub)), 10.0, places=2)
