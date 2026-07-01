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

  const satisfaction =
    typeof tx.satisfaction_rating === "number"
      ? Math.max(0, Math.min(10, tx.satisfaction_rating)) / 10
      : null;
  const impulsePenalty =
    typeof tx.impulse_score === "number"
      ? Math.max(0, Math.min(1, tx.impulse_score)) * 0.35
      : 0;
  const regretPenalty =
    typeof tx.regret_score === "number"
      ? Math.max(0, Math.min(1, tx.regret_score)) * 0.45
      : 0;

  if (satisfaction == null && impulsePenalty === 0 && regretPenalty === 0) return null;

  const baseline = satisfaction ?? 0.67;
  return Math.max(0, Math.min(150, Math.round((baseline + 0.33 - impulsePenalty - regretPenalty) * 150)));
}
