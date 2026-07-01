import type { BankTransaction } from "@/api/banking.api";

/**
 * Display transaction shape consumed by the existing transactions UI
 * (stats, calendar, list). Supports both manual and bank-imported transactions.
 */
export type DisplayTransaction = {
  id: string | number;
  description_raw: string;
  occurred_at: string;
  amount: string;
  direction: string;
  category: string;
  impulse_score: number | null;
  regret_score: number | null;
  satisfaction_rating: number | null;
  regret_rating?: number | null;
  repurchase_likelihood?: number | null;
  usage_frequency?: number | null;
  reflection_text?: string | null;
  considered_at?: string | null;
  feedback_value_score?: number | null;
  value_score?: number | null;
  value_score_source?: string | null;
  personal_value_score?: number | null;
  value_score_confidence?: number | null;
  value_score_model_version?: string | null;
  value_score_computed_at?: string | null;
  source: "manual" | "bank";
};

/** Plaid/bank category values -> our app category slugs */
const PLAID_CATEGORY_MAP: Record<string, string> = {
  // Food & Drink
  FOOD_AND_DRINK: "eating_out",
  RESTAURANTS: "eating_out",
  FOOD: "groceries",
  GROCERIES: "groceries",
  COFFEE_SHOP: "eating_out",
  FAST_FOOD: "eating_out",
  ALCOHOL: "eating_out",
  // Shopping
  MERCHANDISE: "shopping",
  SHOPPING: "shopping",
  SUPERMARKETS_AND_GROCERIES: "groceries",
  // Transport
  TRAVEL: "transport",
  TRANSPORT: "transport",
  GAS: "transport",
  RIDESHARE: "transport",
  PARKING: "transport",
  // Subscriptions & Bills
  SUBSCRIPTION: "subscriptions",
  SUBSCRIPTIONS: "subscriptions",
  UTILITIES: "bills",
  BILLS: "bills",
  RENT: "bills",
  INSURANCE: "bills",
  // Entertainment
  ENTERTAINMENT: "entertainment",
  RECREATION: "entertainment",
  GYMS_AND_FITNESS_CENTERS: "health",
  // Health & Education
  HEALTHCARE: "health",
  HEALTH: "health",
  PHARMACIES: "health",
  EDUCATION: "education",
  // Other
  TRANSFER: "other",
  BANK_FEES: "other",
  OTHER: "other",
};

function mapPlaidCategory(plaidCategory?: string | null): string {
  if (!plaidCategory) return "other";
  const upper = String(plaidCategory).toUpperCase().replace(/\s+/g, "_");
  return PLAID_CATEGORY_MAP[upper] ?? "other";
}

/**
 * Normalizes a bank transaction into the DisplayTransaction shape expected by
 * the existing transactions page, calendar, and stats.
 */
export function normalizeBankTransaction(bankTx: BankTransaction): DisplayTransaction {
  const amountNum = typeof bankTx.amount === "string" ? parseFloat(bankTx.amount) : bankTx.amount;
  const isIncome = amountNum > 0 || bankTx.direction === "income";
  const direction = bankTx.direction ?? (isIncome ? "income" : "spend");
  const amountStr = Math.abs(amountNum).toFixed(2);

  const dateStr = bankTx.occurred_at ?? bankTx.date ?? new Date().toISOString();
  const occurredAt = dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00Z`;

  const description =
    bankTx.merchant_name ?? bankTx.name ?? bankTx.description_raw ?? "Bank transaction";

  return {
    id: bankTx.id,
    description_raw: description,
    occurred_at: occurredAt,
    amount: amountStr,
    direction,
    category: mapPlaidCategory(bankTx.category),
    impulse_score: null,
    regret_score: null,
    satisfaction_rating: null,
    regret_rating: null,
    repurchase_likelihood: null,
    usage_frequency: null,
    reflection_text: null,
    considered_at: null,
    feedback_value_score: null,
    value_score: bankTx.personal_value_score ?? null,
    value_score_source: "model",
    personal_value_score: bankTx.personal_value_score ?? null,
    value_score_confidence: bankTx.value_score_confidence ?? null,
    value_score_model_version: bankTx.value_score_model_version ?? null,
    value_score_computed_at: bankTx.value_score_computed_at ?? null,
    source: "bank",
  };
}
