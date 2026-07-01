import { apiRequest } from "./client";

const auth = { requireAuth: true as const };

export type ValuationJson = Record<string, unknown>;

export type ValuationModelVersion = {
  id: number;
  [key: string]: unknown;
};

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

export const ValuationModelVersionsAPI = {
  list: () => apiRequest<ValuationModelVersion[]>("/api/valuation-model-versions/", auth),
  get: (id: number) =>
    apiRequest<ValuationModelVersion>(`/api/valuation-model-versions/${id}/`, auth),
  create: (data: Partial<ValuationModelVersion>) =>
    apiRequest<ValuationModelVersion>("/api/valuation-model-versions/", {
      ...auth,
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ValuationModelVersion>) =>
    apiRequest<ValuationModelVersion>(`/api/valuation-model-versions/${id}/`, {
      ...auth,
      method: "PUT",
      body: JSON.stringify(data),
    }),
  patch: (id: number, data: Partial<ValuationModelVersion>) =>
    apiRequest<ValuationModelVersion>(`/api/valuation-model-versions/${id}/`, {
      ...auth,
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    apiRequest<null>(`/api/valuation-model-versions/${id}/`, {
      ...auth,
      method: "DELETE",
    }),
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
