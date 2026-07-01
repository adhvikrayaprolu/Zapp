/**
 * Maps onboarding "Monthly income" bucket labels to a representative monthly amount (USD).
 * Keep in sync with `INCOME_OPTIONS` in `OnboardingPage.tsx`.
 */
const INCOME_RANGE_MID_MONTHLY: Record<string, number> = {
  "< $2k": 1000,
  "$2k-4k": 3000,
  "$4k-7k": 5500,
  "$7k-10k": 8500,
  "$10k+": 12500,
};

export function estimatedMonthlyIncomeFromIncomeRange(incomeRange: string): number | null {
  const key = incomeRange.trim();
  const mid = INCOME_RANGE_MID_MONTHLY[key];
  return mid != null ? mid : null;
}

export function resolveStatedMonthlyIncome(profile: {
  monthly_income?: string | number | null;
  income_range?: string | null;
}): number | null {
  const raw = profile.monthly_income;
  if (raw != null && raw !== "") {
    const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return estimatedMonthlyIncomeFromIncomeRange(profile.income_range ?? "");
}
