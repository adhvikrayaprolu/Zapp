import { apiRequest } from "./client";

const auth = { requireAuth: true as const };

export type ValuationJson = Record<string, unknown>;

export type SubscriptionValuation = {
  id: number;
  subscription?: number;
  personal_value_score?: number | null;
  recommendation?: string;
  confidence?: number | null;
  evidence_json?: ValuationJson;
  explanation_json?: ValuationJson;
  [key: string]: unknown;
};

export type ItemValuation = {
  id: number;
  description?: string;
  item_name?: string;
  item_category?: string;
  amount?: string | number;
  observed_price?: string | number | null;
  estimated_fair_price?: string | number | null;
  personal_value_score?: number | null;
  recommendation?: string;
  confidence?: number | null;
  evidence_json?: ValuationJson;
  reasoning_json?: ValuationJson;
  [key: string]: unknown;
};

/** Value-score pipeline (platform_bundle model → SubscriptionValuation). */
export const ValueScoresAPI = {
  me: (params?: { subscription?: number }) => {
    const qs =
      params?.subscription != null ? `?subscription=${params.subscription}` : "";
    return apiRequest<SubscriptionValuation[]>(`/api/value-scores/me/${qs}`, auth);
  },
  recompute: (body?: { subscription_ids?: number[] }) =>
    apiRequest<{
      ok: boolean;
      valuations?: SubscriptionValuation[];
      model_version?: string;
      message?: string;
    }>("/api/value-scores/recompute/", {
      ...auth,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
};

export const SubscriptionValuationsAPI = {
  list: (params?: { subscription?: number }) => {
    const qs = params?.subscription != null ? `?subscription=${params.subscription}` : "";
    return apiRequest<SubscriptionValuation[]>(`/api/subscription-valuations/${qs}`,
      auth
    );
  },
  get: (id: number) =>
    apiRequest<SubscriptionValuation>(`/api/subscription-valuations/${id}/`, auth),
  create: (data: Partial<SubscriptionValuation>) =>
    apiRequest<SubscriptionValuation>("/api/subscription-valuations/", {
      ...auth,
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<SubscriptionValuation>) =>
    apiRequest<SubscriptionValuation>(`/api/subscription-valuations/${id}/`, {
      ...auth,
      method: "PUT",
      body: JSON.stringify(data),
    }),
  patch: (id: number, data: Partial<SubscriptionValuation>) =>
    apiRequest<SubscriptionValuation>(`/api/subscription-valuations/${id}/`, {
      ...auth,
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    apiRequest<null>(`/api/subscription-valuations/${id}/`, {
      ...auth,
      method: "DELETE",
    }),
};

export const ItemValuationsAPI = {
  list: () => apiRequest<ItemValuation[]>("/api/item-valuations/", auth),
  get: (id: number) =>
    apiRequest<ItemValuation>(`/api/item-valuations/${id}/`, auth),
  create: (data: Partial<ItemValuation>) =>
    apiRequest<ItemValuation>("/api/item-valuations/", {
      ...auth,
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ItemValuation>) =>
    apiRequest<ItemValuation>(`/api/item-valuations/${id}/`, {
      ...auth,
      method: "PUT",
      body: JSON.stringify(data),
    }),
  patch: (id: number, data: Partial<ItemValuation>) =>
    apiRequest<ItemValuation>(`/api/item-valuations/${id}/`, {
      ...auth,
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    apiRequest<null>(`/api/item-valuations/${id}/`, {
      ...auth,
      method: "DELETE",
    }),
};

export type PurchaseCategory =
  | "subscriptions"
  | "groceries"
  | "eating_out"
  | "transport"
  | "shopping"
  | "bills"
  | "entertainment"
  | "health"
  | "education"
  | "other";

export const PURCHASE_CATEGORY_OPTIONS: { value: PurchaseCategory; label: string }[] = [
  { value: "shopping", label: "Shopping" },
  { value: "eating_out", label: "Eating out" },
  { value: "entertainment", label: "Entertainment" },
  { value: "groceries", label: "Groceries" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "transport", label: "Transport" },
  { value: "bills", label: "Bills" },
  { value: "other", label: "Other" },
];

export type PurchaseCheckVerdict = "buy" | "wait" | "skip";

export type PurchaseCheckResult = {
  item: string;
  amount: string;
  category: PurchaseCategory;
  /** 0-150, same scale as value scores. */
  score: number;
  verdict: PurchaseCheckVerdict;
  verdict_label: string;
  reasons: string[];
  adjustments: { kind: string; points: number }[];
  stats: {
    history_score: number | null;
    rated_purchases: number;
    category_purchases: number;
    spent_this_month: number;
    typical_month: number | null;
    lookback_days: number;
  };
};

/** Rule-based pre-purchase check computed from the user's own history (no AI/model). */
export const PurchaseCheckAPI = {
  check: (body: { item?: string; amount: string; category: PurchaseCategory }) =>
    apiRequest<PurchaseCheckResult>("/api/purchase-check/", {
      ...auth,
      method: "POST",
      body: JSON.stringify(body),
    }),
};
