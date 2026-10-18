import type { DisplayTransaction } from "@/features/transactions/utils/normalizeBankTransaction";
import { formatLocalDateYYYYMMDD, getLocalDateKey } from "@/shared/date";
import { deriveTransactionValueScore } from "@/shared/transaction-valuation";
import { getValuePresentation } from "@/shared/valuation";

export const CHART_DAYS = 14;

export type HomeMetrics = {
  /** Total spend in the current calendar month. */
  monthSpend: number;
  /** Spend change vs the same days of last month, in percent; null when last month has no spend. */
  spendChangePct: number | null;
  purchaseCount: number;
  /** Average 0-150 value score across this month's scored purchases. */
  averageScore: number | null;
  /** Daily spend for the last CHART_DAYS days, oldest first. */
  dailySpend: { day: string; spend: number }[];
  highValueCount: number;
  onTargetCount: number;
  belowTargetCount: number;
  scoredCount: number;
};

type ScoredTransaction = Pick<
  DisplayTransaction,
  | "occurred_at"
  | "amount"
  | "direction"
  | "value_score"
  | "personal_value_score"
  | "feedback_value_score"
  | "satisfaction_rating"
  | "impulse_score"
  | "regret_score"
>;

function monthKey(date: Date) {
  return formatLocalDateYYYYMMDD(date).slice(0, 7);
}

/** Summarize the user's own transactions for the dashboard home cards. */
export function computeHomeMetrics(transactions: ScoredTransaction[], now: Date = new Date()): HomeMetrics {
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const dayOfMonth = now.getDate();

  const days: string[] = [];
  for (let i = CHART_DAYS - 1; i >= 0; i -= 1) {
    days.push(formatLocalDateYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)));
  }
  const spendByDay = new Map(days.map((day) => [day, 0]));

  let monthSpend = 0;
  let lastMonthToDateSpend = 0;
  let purchaseCount = 0;
  let scoreTotal = 0;
  let scoredCount = 0;
  let highValueCount = 0;
  let onTargetCount = 0;
  let belowTargetCount = 0;

  for (const tx of transactions) {
    if (tx.direction !== "spend") continue;
    const amount = Number.parseFloat(tx.amount);
    if (!Number.isFinite(amount)) continue;

    const day = getLocalDateKey(tx.occurred_at);
    if (spendByDay.has(day)) spendByDay.set(day, (spendByDay.get(day) ?? 0) + amount);

    const month = day.slice(0, 7);
    if (month === lastMonth && Number(day.slice(8, 10)) <= dayOfMonth) {
      lastMonthToDateSpend += amount;
    }
    if (month !== thisMonth) continue;

    monthSpend += amount;
    purchaseCount += 1;

    const score = deriveTransactionValueScore(tx);
    if (score == null) continue;
    scoredCount += 1;
    scoreTotal += score;
    const tier = getValuePresentation(score).tier;
    if (tier === "high_value") highValueCount += 1;
    else if (tier === "decent") onTargetCount += 1;
    else belowTargetCount += 1;
  }

  return {
    monthSpend,
    spendChangePct:
      lastMonthToDateSpend > 0
        ? Math.round(((monthSpend - lastMonthToDateSpend) / lastMonthToDateSpend) * 100)
        : null,
    purchaseCount,
    averageScore: scoredCount > 0 ? Math.round(scoreTotal / scoredCount) : null,
    dailySpend: days.map((day) => ({ day, spend: Math.round((spendByDay.get(day) ?? 0) * 100) / 100 })),
    highValueCount,
    onTargetCount,
    belowTargetCount,
    scoredCount,
  };
}
