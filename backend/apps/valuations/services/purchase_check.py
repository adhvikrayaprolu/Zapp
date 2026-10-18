"""
Pre-purchase check: a transparent, rule-based estimate of how well a prospective
purchase fits the user, computed only from their own transaction history.

This is deliberately not the ML value-score model (which needs external
checkpoints): every adjustment is explained back to the user with the numbers
behind it.
"""
from __future__ import annotations

import math
from datetime import timedelta
from decimal import Decimal
from statistics import mean, median

from django.utils import timezone

from apps.transactions.models import Transaction, TransactionCategory, TransactionDirection

LOOKBACK_DAYS = 180
NEUTRAL_SCORE = 100
NEUTRAL_SATISFACTION = 0.6
BUY_MIN_SCORE = 90
WAIT_MIN_SCORE = 75

VERDICTS = {
    "buy": "Looks worth it",
    "wait": "Sleep on it",
    "skip": "Probably skip",
}


def estimate_score_from_ratings(
    satisfaction_rating: int | None, impulse_score: float | None, regret_score: float | None
) -> int | None:
    """Mirror of estimateValueScoreFromRatings in frontend/src/shared/transaction-valuation.ts."""
    satisfaction = None if satisfaction_rating is None else max(0, min(10, satisfaction_rating)) / 10
    impulse = 0.0 if impulse_score is None else max(0.0, min(1.0, float(impulse_score)))
    regret = 0.0 if regret_score is None else max(0.0, min(1.0, float(regret_score)))
    if satisfaction is None and impulse == 0 and regret == 0:
        return None
    baseline = NEUTRAL_SATISFACTION if satisfaction is None else satisfaction
    # floor(x + 0.5) matches JS Math.round; Python's round() is banker's rounding.
    return max(0, min(150, math.floor(15 + baseline * 135 - impulse * 25 - regret * 35 + 0.5)))


def transaction_value_score(tx: Transaction) -> int | None:
    """Best available 0-150 score for a past transaction (model > feedback > ratings)."""
    if tx.personal_value_score is not None:
        return int(tx.personal_value_score)
    if tx.feedback_value_score is not None:
        return round(float(tx.feedback_value_score) * 150)
    return estimate_score_from_ratings(tx.satisfaction_rating, tx.impulse_score, tx.regret_score)


def _money(value: float) -> str:
    return f"${value:,.0f}" if value >= 100 else f"${value:,.2f}"


def check_purchase(user, *, amount: Decimal, category: str, item: str = "", now=None) -> dict:
    now = now or timezone.now()
    amount_f = float(amount)
    label = TransactionCategory(category).label.lower()
    local_now = timezone.localtime(now)
    month_start = local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Encrypted amount/score fields can't be aggregated in SQL; the window keeps this bounded.
    history = [
        tx
        for tx in Transaction.objects.filter(
            user=user,
            direction=TransactionDirection.SPEND,
            category=category,
            occurred_at__gte=now - timedelta(days=LOOKBACK_DAYS),
            occurred_at__lte=now,
        )
    ]

    reasons: list[str] = []
    adjustments: list[dict] = []

    scores = [s for s in (transaction_value_score(tx) for tx in history) if s is not None]
    if scores:
        history_score = round(mean(scores))
        score = float(history_score)
        reasons.append(
            f"Your past {label} purchases average a value score of {history_score}/150 "
            f"across {len(scores)} rated purchase{'s' if len(scores) != 1 else ''}."
        )
    else:
        history_score = None
        score = float(NEUTRAL_SCORE)
        reasons.append(f"You have no rated {label} purchases yet, so this starts from a neutral {NEUTRAL_SCORE}.")

    def adjust(points: int, reason: str, kind: str) -> None:
        nonlocal score
        score += points
        adjustments.append({"kind": kind, "points": points})
        reasons.append(reason)

    # Budget pace: this purchase vs the user's typical month in the category.
    this_month = sum(float(tx.amount) for tx in history if tx.occurred_at >= month_start)
    prior = [tx for tx in history if tx.occurred_at < month_start]
    prior_months = {(timezone.localtime(tx.occurred_at).year, timezone.localtime(tx.occurred_at).month) for tx in prior}
    typical_month = sum(float(tx.amount) for tx in prior) / len(prior_months) if prior_months else None
    projected = this_month + amount_f
    if typical_month:
        ratio = projected / typical_month
        if ratio > 1.25:
            adjust(
                -min(30, round((ratio - 1.25) * 40) + 5),
                f"This would bring {label} to {_money(projected)} this month, "
                f"vs your usual {_money(typical_month)}.",
                "over_monthly_pace",
            )
        else:
            reasons.append(
                f"You'd stay within your usual {label} spend "
                f"({_money(projected)} of about {_money(typical_month)} a month)."
            )

    # Price vs the user's typical ticket in the category.
    if history:
        typical_ticket = median(float(tx.amount) for tx in history)
        if typical_ticket > 0 and amount_f > 4 * typical_ticket:
            adjust(
                -25,
                f"At {_money(amount_f)} it's about {amount_f / typical_ticket:.0f}x your typical "
                f"{label} purchase ({_money(typical_ticket)}).",
                "far_above_typical_price",
            )
        elif typical_ticket > 0 and amount_f > 2 * typical_ticket:
            adjust(
                -12,
                f"At {_money(amount_f)} it's about {amount_f / typical_ticket:.1f}x your typical "
                f"{label} purchase ({_money(typical_ticket)}).",
                "above_typical_price",
            )

    # Purchase velocity in the category.
    recent = sum(1 for tx in history if tx.occurred_at >= now - timedelta(days=7))
    if recent >= 3:
        adjust(-10, f"You've already made {recent} {label} purchases in the last 7 days.", "recent_frequency")

    final = max(0, min(150, round(score)))
    verdict = "buy" if final >= BUY_MIN_SCORE else "wait" if final >= WAIT_MIN_SCORE else "skip"
    return {
        "item": item,
        "amount": f"{amount_f:.2f}",
        "category": category,
        "score": final,
        "verdict": verdict,
        "verdict_label": VERDICTS[verdict],
        "reasons": reasons,
        "adjustments": adjustments,
        "stats": {
            "history_score": history_score,
            "rated_purchases": len(scores),
            "category_purchases": len(history),
            "spent_this_month": round(this_month, 2),
            "typical_month": None if typical_month is None else round(typical_month, 2),
            "lookback_days": LOOKBACK_DAYS,
        },
    }
