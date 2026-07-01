import { apiRequest } from "./client";

export type Subscription = {
  id: number;
  merchant?: number | null;
  merchant_name?: string;
  amount: string | number;
  billing_cycle: string;
  status: string;
  started_at: string;
  notes?: string | null;
  value_score?: number | null;
};

export type NewSubscription = {
  merchant?: number;
  merchant_name?: string;
  amount: string | number;
  billing_cycle: string;
  status?: string;
  started_at: string;
  notes?: string;
};

type BackendSubscription = {
  id: number;
  merchant?: number | null;
  price: string | number;
  billing_cycle: string;
  status: string;
  started_on?: string | null;
  notes?: string | null;
  /** Legacy / NLP feedback pipeline (0–1); prefer latest_value_score for UI when set. */
  feedback_value_score?: number | null;
  /** Latest value-score model output (0–150) from SubscriptionValuation. */
  latest_value_score?: number | null;
};

type BackendSubscriptionPayload = {
  merchant?: number;
  price?: string | number;
  billing_cycle?: string;
  status?: string;
  started_on?: string;
  notes?: string;
};

const auth = { requireAuth: true as const };

function normalizeStartedAt(value?: string | null) {
  if (!value) return "";
  return value.includes("T") ? value : `${value}T00:00:00Z`;
}

function normalizeSubscription(data: BackendSubscription): Subscription {
  const fromModel = data.latest_value_score;
  return {
    id: data.id,
    merchant: data.merchant ?? null,
    amount: data.price,
    billing_cycle: data.billing_cycle,
    status: data.status,
    started_at: normalizeStartedAt(data.started_on),
    notes: data.notes,
    value_score: fromModel != null ? fromModel : data.feedback_value_score,
  };
}

function serializeSubscriptionInput(data: Partial<NewSubscription>): BackendSubscriptionPayload {
  const payload: BackendSubscriptionPayload = {};

  if (data.merchant != null) payload.merchant = data.merchant;
  if (data.amount != null) payload.price = data.amount;
  if (data.billing_cycle != null) payload.billing_cycle = data.billing_cycle;
  if (data.status != null) payload.status = data.status;
  if (data.started_at != null) payload.started_on = data.started_at.slice(0, 10);
  if (data.notes != null) payload.notes = data.notes;

  return payload;
}

export const SubscriptionsAPI = {
  list: async (opts?: { signal?: AbortSignal }) => {
    const data = await apiRequest<BackendSubscription[]>("/api/subscriptions/", {
      ...auth,
      signal: opts?.signal,
    });
    return data.map(normalizeSubscription);
  },
  get: async (id: number) => {
    const data = await apiRequest<BackendSubscription>(`/api/subscriptions/${id}/`, auth);
    return normalizeSubscription(data);
  },
  create: async (data: NewSubscription) => {
    const created = await apiRequest<BackendSubscription>("/api/subscriptions/", {
      ...auth,
      method: "POST",
      body: JSON.stringify(serializeSubscriptionInput(data)),
      audit: { eventName: "subscription.create", action: "create", resourceType: "subscription" },
    });
    return normalizeSubscription(created);
  },
  update: async (id: number, data: Partial<NewSubscription>) => {
    const updated = await apiRequest<BackendSubscription>(`/api/subscriptions/${id}/`, {
      ...auth,
      method: "PUT",
      body: JSON.stringify(serializeSubscriptionInput(data)),
      audit: { eventName: "subscription.update", action: "update", resourceType: "subscription", resourceId: id },
    });
    return normalizeSubscription(updated);
  },
  patch: async (id: number, data: Partial<NewSubscription>) => {
    const updated = await apiRequest<BackendSubscription>(`/api/subscriptions/${id}/`, {
      ...auth,
      method: "PATCH",
      body: JSON.stringify(serializeSubscriptionInput(data)),
      audit: { eventName: "subscription.update", action: "update", resourceType: "subscription", resourceId: id },
    });
    return normalizeSubscription(updated);
  },
  remove: (id: number) =>
    apiRequest<null>(`/api/subscriptions/${id}/`, {
      ...auth,
      method: "DELETE",
      audit: { eventName: "subscription.delete", action: "delete", resourceType: "subscription", resourceId: id },
    }),
};
