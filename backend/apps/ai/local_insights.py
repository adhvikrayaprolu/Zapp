"""
ZappBot answers computed directly from the user's own data.

Used when no LLM is configured (and as a deterministic layer for common questions):
purchase decisions, subscription value, overall value scores, and where to save.
Every number in a reply comes from the user's transactions, subscriptions and
value scores; nothing is invented.
"""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from statistics import mean

from django.utils import timezone

from apps.subscriptions.models import SubscriptionStatus
from apps.transactions.models import Transaction, TransactionCategory, TransactionDirection
from apps.valuations.services.persistence import latest_subscription_valuations_queryset
from apps.valuations.services.purchase_check import check_purchase, transaction_value_score

HIGH_VALUE_MIN = 101
ON_TARGET_MIN = 90

_AMOUNT_RE = re.compile(r"\$\s*(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:dollars|bucks|usd)\b", re.I)
_PURCHASE_RE = re.compile(
    r"\b(should i (?:buy|get|purchase|order|subscribe)|is (?:it|this|that) worth|worth (?:it|buying)|"
    r"can i afford|thinking (?:of|about) (?:buying|getting)|want to (?:buy|get))\b",
    re.I,
)
_SUBSCRIPTION_RE = re.compile(r"\bsubscriptions?\b|\bcancel\b|\brecurring\b", re.I)
_VALUE_RE = re.compile(r"\b(value scores?|how am i doing|how'?s my (?:spending|value)|scores?|best value|worst value)\b", re.I)
_SAVE_RE = re.compile(r"\b(save|saving|savings|cut back|cut down|spend less|reduce|budget|overspend\w*)\b", re.I)

# Keyword hints for mapping a purchase question to a spending category.
_CATEGORY_HINTS: dict[str, tuple[str, ...]] = {
    TransactionCategory.EATING_OUT: ("restaurant", "dinner", "lunch", "takeout", "delivery", "coffee", "uber eats", "doordash", "pizza", "sushi", "bar"),
    TransactionCategory.GROCERIES: ("grocer", "groceries", "costco", "whole foods", "trader joe", "produce", "supermarket"),
    TransactionCategory.ENTERTAINMENT: ("concert", "ticket", "movie", "game", "games", "festival", "show", "netflix", "spotify", "hulu", "disney"),
    TransactionCategory.TRANSPORT: ("uber", "lyft", "gas", "flight", "train", "bus", "car", "bike", "parking"),
    TransactionCategory.HEALTH: ("gym", "fitness", "doctor", "medicine", "vitamin", "therapy", "yoga", "wellness"),
    TransactionCategory.EDUCATION: ("course", "class", "book", "books", "tuition", "udemy", "coursera", "workshop"),
    TransactionCategory.SUBSCRIPTIONS: ("subscription", "membership", "plan", "premium"),
    TransactionCategory.BILLS: ("bill", "rent", "utility", "internet", "phone", "insurance"),
    TransactionCategory.SHOPPING: ("headphones", "shoes", "jacket", "laptop", "phone case", "clothes", "watch", "amazon", "gadget"),
}

SUGGESTED_QUESTIONS = (
    "How much did I spend this month?",
    "Should I buy wireless headphones for $199?",
    "Which subscription gives me the least value?",
    "Where can I cut back?",
)


def _money(value: float) -> str:
    return f"${value:,.2f}"


def _label(category: str) -> str:
    try:
        return TransactionCategory(category).label.lower()
    except ValueError:
        return category.replace("_", " ")


def _parse_amount(text: str) -> Decimal | None:
    match = _AMOUNT_RE.search(text)
    if not match:
        return None
    raw = (match.group(1) or match.group(2) or "").replace(",", "")
    try:
        value = Decimal(raw)
    except InvalidOperation:
        return None
    return value if value > 0 else None


def _guess_category(text: str) -> str:
    lowered = text.lower()
    for category, hints in _CATEGORY_HINTS.items():
        if any(re.search(rf"(?<!\w){re.escape(hint)}(?!\w)", lowered) for hint in hints):
            return category
    return TransactionCategory.SHOPPING


def _guess_item(text: str) -> str:
    match = re.search(
        r"\b(?:buy(?:ing)?|get(?:ting)?|purchas(?:e|ing)|order(?:ing)?)\s+(?:a |an |the |some |new )?"
        r"([a-z0-9][a-z0-9 \-']{1,40}?)(?:\s+for\b|\s+at\b|\?|$|,)",
        text,
        re.I,
    )
    return match.group(1).strip() if match else ""


def _spend_transactions(user, *, days: int):
    since = timezone.now() - timedelta(days=days)
    return list(
        Transaction.objects.filter(user=user, direction=TransactionDirection.SPEND, occurred_at__gte=since)
    )


def _reply(text: str, *, topic: str) -> dict:
    # Same shape as the router's direct answers in views._build_local_direct_response.
    return {"assistant_text": text, "response_style": "direct_answer", "mode": "insights", "insight_topic": topic}


def answer_purchase_question(user, content: str) -> dict:
    amount = _parse_amount(content)
    category = _guess_category(content)
    item = _guess_item(content)
    if amount is None:
        what = f" for {item}" if item else ""
        return _reply(
            f"Happy to check that{what}. Roughly how much does it cost? For example: "
            f"\"Should I buy {item or 'it'} for $120?\" You can also use the Buy Advisor (shopping-bag button) "
            "to pick the category yourself.",
            topic="purchase_needs_amount",
        )

    result = check_purchase(user, amount=amount, category=category, item=item)
    subject = f"{item} for {_money(float(amount))}" if item else _money(float(amount))
    lines = [
        f"{result['verdict_label']}: {subject} scores {result['score']}/150 for you "
        f"(about 100 is a good match), treating it as {_label(category)}.",
        *[f"• {reason}" for reason in result["reasons"]],
    ]
    if result["verdict"] != "buy":
        lines.append("If you still want it, waiting 24 hours and re-checking is a cheap way to be sure.")
    return _reply("\n".join(lines), topic="purchase")


def answer_subscription_value(user, financial_context: dict) -> dict:
    latest = {
        v.subscription_id: v
        for v in latest_subscription_valuations_queryset(user).select_related("subscription__merchant")
        if v.subscription.status == SubscriptionStatus.ACTIVE and v.personal_value_score is not None
    }
    commitment = financial_context.get("summary", {}).get("active_subscription_monthly_commitment")
    if not latest:
        return _reply(
            "I don't have value scores for your subscriptions yet. Once they're scored you'll see them on "
            "the Subscriptions page, and I can tell you which ones to keep."
            + (f" Right now your active subscriptions add about ${commitment} a month." if commitment else ""),
            topic="subscriptions_unscored",
        )

    ranked = sorted(latest.values(), key=lambda v: v.personal_value_score)
    worst, best = ranked[0], ranked[-1]
    lines = [
        f"Your lowest-value subscription is {worst.subscription.merchant.name} "
        f"({worst.personal_value_score}/150, ${worst.subscription.price} {worst.subscription.billing_cycle}).",
        f"Your best is {best.subscription.merchant.name} at {best.personal_value_score}/150.",
    ]
    below = [v for v in ranked if v.personal_value_score < ON_TARGET_MIN]
    if below:
        names = ", ".join(v.subscription.merchant.name for v in below[:3])
        lines.append(f"Below target (under {ON_TARGET_MIN}): {names}. Those are the first ones worth reconsidering.")
    if commitment:
        lines.append(f"In total your active subscriptions cost about ${commitment} a month.")
    return _reply(" ".join(lines), topic="subscriptions")


def answer_value_overview(user) -> dict:
    now = timezone.localtime()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    scored = [
        (tx, score)
        for tx in _spend_transactions(user, days=90)
        if (score := transaction_value_score(tx)) is not None
    ]
    month = [(tx, s) for tx, s in scored if tx.occurred_at >= month_start]
    if not scored:
        return _reply(
            "I don't have any rated purchases yet. Rate a few from the dashboard prompts and I'll show you "
            "where your money gets the most value.",
            topic="value_empty",
        )

    pool = month or scored
    period = "this month" if month else "over the last 90 days"
    avg = round(mean(s for _, s in pool))
    high = sum(1 for _, s in pool if s >= HIGH_VALUE_MIN)
    low = sum(1 for _, s in pool if s < ON_TARGET_MIN)

    by_category: dict[str, list[int]] = defaultdict(list)
    for tx, s in scored:
        by_category[tx.category].append(s)
    ranked = sorted(
        ((cat, round(mean(vals)), len(vals)) for cat, vals in by_category.items() if len(vals) >= 3),
        key=lambda row: row[1],
    )
    lines = [
        f"Your purchases average {avg}/150 {period} across {len(pool)} rated purchases: "
        f"{high} high value and {low} below target."
    ]
    if len(ranked) >= 2:
        best, worst = ranked[-1], ranked[0]
        lines.append(
            f"You get the most value from {_label(best[0])} ({best[1]}/150) and the least from "
            f"{_label(worst[0])} ({worst[1]}/150)."
        )
    return _reply(" ".join(lines), topic="value_overview")


def answer_savings(user, financial_context: dict) -> dict:
    now = timezone.localtime()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    history = _spend_transactions(user, days=180)

    this_month: dict[str, float] = defaultdict(float)
    prior: dict[str, float] = defaultdict(float)
    prior_months: set[tuple[int, int]] = set()
    scores: dict[str, list[int]] = defaultdict(list)
    for tx in history:
        amount = float(tx.amount)
        if tx.occurred_at >= month_start:
            this_month[tx.category] += amount
        else:
            prior[tx.category] += amount
            local = timezone.localtime(tx.occurred_at)
            prior_months.add((local.year, local.month))
        if (score := transaction_value_score(tx)) is not None:
            scores[tx.category].append(score)

    if not history:
        return _reply("I don't see any spending yet, so there's nothing to trim. Nice.", topic="savings_empty")

    months = max(1, len(prior_months))
    # Scale the usual monthly amount to the same point in the month for a fair comparison.
    fraction = now.day / 30
    over_pace = sorted(
        (
            (cat, spent, prior[cat] / months * fraction)
            for cat, spent in this_month.items()
            if prior.get(cat) and spent > prior[cat] / months * fraction * 1.2
        ),
        key=lambda row: row[1] - row[2],
        reverse=True,
    )
    low_value = sorted(
        ((cat, round(mean(vals))) for cat, vals in scores.items() if len(vals) >= 3 and mean(vals) < ON_TARGET_MIN),
        key=lambda row: row[1],
    )

    lines: list[str] = []
    for cat, spent, usual in over_pace[:2]:
        lines.append(
            f"{_label(cat).capitalize()} is running ahead of your usual pace: {_money(spent)} so far vs about "
            f"{_money(usual)} by this point in a typical month."
        )
    for cat, avg in low_value[:2]:
        lines.append(f"Your {_label(cat)} purchases average {avg}/150, below the ~100 match line, so that's where cuts hurt least.")
    commitment = financial_context.get("summary", {}).get("active_subscription_monthly_commitment")
    if commitment:
        lines.append(f"Subscriptions are a fixed ${commitment} a month. Ask me which one gives you the least value.")
    if not lines:
        lines.append("You're on or under your usual pace in every category this month, and nothing stands out as low value.")
    return _reply(" ".join(lines), topic="savings")


def answer_overview(financial_context: dict) -> dict:
    summary = financial_context.get("summary", {})
    spent = summary.get("spend_month_to_date")
    count = summary.get("spend_transaction_count_month_to_date") or 0
    intro = (
        f"So far this month you've spent ${spent} across {count} purchase{'s' if count != 1 else ''}. "
        if spent and count
        else ""
    )
    examples = "; ".join(f"\"{q}\"" for q in SUGGESTED_QUESTIONS)
    return _reply(
        f"{intro}I can answer questions about your own spending, subscriptions and value scores, "
        f"or check a purchase before you buy. Try: {examples}.",
        topic="overview",
    )


def build_local_insight_response(user, content: str, financial_context: dict) -> dict:
    """Pick the best data-backed answer for a free-form question."""
    if _PURCHASE_RE.search(content) or (_parse_amount(content) and re.search(r"\b(buy|get|purchase)\b", content, re.I)):
        return answer_purchase_question(user, content)
    if _SUBSCRIPTION_RE.search(content):
        return answer_subscription_value(user, financial_context)
    if _SAVE_RE.search(content):
        return answer_savings(user, financial_context)
    if _VALUE_RE.search(content):
        return answer_value_overview(user)
    return answer_overview(financial_context)
