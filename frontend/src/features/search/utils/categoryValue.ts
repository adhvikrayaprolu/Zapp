import { PURCHASE_CATEGORY_OPTIONS } from "@/api/valuations.api";
import type { DisplayTransaction } from "@/features/transactions/utils/normalizeBankTransaction";
import { deriveTransactionValueScore } from "@/shared/transaction-valuation";

export const MIN_RATED_PURCHASES = 3;

export type CategoryValue = {
  category: string;
  label: string;
  averageScore: number;
  ratedCount: number;
};

function labelFor(category: string) {
  return (
    PURCHASE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/**
 * Average value score per spending category, best first. Categories with fewer
 * than MIN_RATED_PURCHASES scored purchases are left out to avoid noisy ranks.
 */
export function rankCategoriesByValue(
  transactions: Pick<
    DisplayTransaction,
    | "category"
    | "direction"
    | "value_score"
    | "personal_value_score"
    | "feedback_value_score"
    | "satisfaction_rating"
    | "impulse_score"
    | "regret_score"
  >[],
): CategoryValue[] {
  const byCategory = new Map<string, number[]>();
  for (const tx of transactions) {
    if (tx.direction !== "spend" || !tx.category) continue;
    const score = deriveTransactionValueScore(tx);
    if (score == null) continue;
    const scores = byCategory.get(tx.category) ?? [];
    scores.push(score);
    byCategory.set(tx.category, scores);
  }

  return [...byCategory.entries()]
    .filter(([, scores]) => scores.length >= MIN_RATED_PURCHASES)
    .map(([category, scores]) => ({
      category,
      label: labelFor(category),
      averageScore: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
      ratedCount: scores.length,
    }))
    .sort((a, b) => b.averageScore - a.averageScore);
}
