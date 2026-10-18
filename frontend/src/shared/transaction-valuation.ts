import type { Transaction } from "@/api/transactions.api";
import { normalizeModelValueScore } from "@/shared/valuation";

type TransactionValueScoreShape = Pick<
  Transaction,
  "value_score" | "feedback_value_score" | "satisfaction_rating" | "impulse_score" | "regret_score"
> & {
  personal_value_score?: number | null;
};

export function deriveTransactionValueScore(tx: TransactionValueScoreShape): number | null {
  if (typeof tx.value_score === "number") {
    return normalizeModelValueScore(tx.value_score);
  }

  if (typeof tx.personal_value_score === "number") {
    return normalizeModelValueScore(tx.personal_value_score);
  }

  if (typeof tx.feedback_value_score === "number") {
    return normalizeModelValueScore(tx.feedback_value_score);
  }

  return estimateValueScoreFromRatings(tx.satisfaction_rating, tx.impulse_score, tx.regret_score);
}

/**
 * Fallback 0-150 estimate when no model or feedback score exists, from the
 * user's own ratings. Calibrated so 7/10 satisfaction lands just above the
 * ~100 "match" line, 6/10 is on target, 5/10 is low value, and impulse/regret
 * pull the score down. Mirrored server-side in
 * backend/apps/valuations/services/purchase_check.py — keep them in sync.
 */
export function estimateValueScoreFromRatings(
  satisfactionRating: number | null | undefined,
  impulseScore: number | null | undefined,
  regretScore: number | null | undefined,
): number | null {
  const satisfaction =
    typeof satisfactionRating === "number" ? Math.max(0, Math.min(10, satisfactionRating)) / 10 : null;
  const impulse = typeof impulseScore === "number" ? Math.max(0, Math.min(1, impulseScore)) : 0;
  const regret = typeof regretScore === "number" ? Math.max(0, Math.min(1, regretScore)) : 0;

  if (satisfaction == null && impulse === 0 && regret === 0) return null;

  const baseline = satisfaction ?? NEUTRAL_SATISFACTION;
  const score = 15 + baseline * 135 - impulse * 25 - regret * 35;
  return Math.max(0, Math.min(150, Math.round(score)));
}

const NEUTRAL_SATISFACTION = 0.6;
