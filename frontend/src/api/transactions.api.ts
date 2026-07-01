import { apiRequest } from "./client";

export type Transaction = {
  id: number;
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
  feedback_confidence?: number | null;
  value_score?: number | null;
  value_score_source?: string | null;
  value_score_confidence?: number | null;
};

export type NewTransaction = {
  description_raw: string;
  amount: string;
  direction: string;
  category: string;
  occurred_at: string;
  satisfaction_rating: number | null;
};

/** Response item from GET /api/transactions/feedback-candidates/ */
export type FeedbackCandidate = {
  transaction_id: number | string;
};

/** Payload for transaction-level feedback (ML pipeline). */
export type TransactionFeedbackPayload = {
  satisfaction_rating: number;
  regret_rating: number;
  repurchase_likelihood: number;
  usage_frequency?: number;
  reflection_text?: string;
  considered_at: string;
};

/** One page of the cursor-paginated transactions endpoint. */
export type TransactionsPage = {
  results: Transaction[];
  next: string | null;
  previous: string | null;
};

type TransactionQueryParams = {
  category?: string;
  direction?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  page_size?: number;
  cursor?: string;
};

function buildTransactionQuery(params?: TransactionQueryParams): string {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.direction) query.set("direction", params.direction);
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** Convert an absolute DRF `next`/`previous` URL into an apiRequest-relative path. */
function toRelativeCursorPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url; // already relative
  }
}

export const TransactionsAPI = {
  recent: (limit = 6) => apiRequest<Transaction[]>(`/api/transactions/?limit=${limit}`, { requireAuth: true }),
  /** Fetch transactions recommended for feedback by the ML pipeline. */
  getFeedbackCandidates: () =>
    apiRequest<FeedbackCandidate[]>("/api/transactions/feedback-candidates/", { requireAuth: true }),
  /**
   * Full manual-transaction list. Follows cursor pagination under the hood and
   * returns the complete array, so callers that need the whole set (merged
   * timeline, spending calendar, stats) are unaffected by server-side paging.
   * The legacy `?limit=` path returns a plain array in a single request.
   */
  list: async (
    params?: { category?: string; direction?: string; date_from?: string; date_to?: string; limit?: number; signal?: AbortSignal; }
  ): Promise<Transaction[]> => {
    let path = `/api/transactions/${buildTransactionQuery(params)}`;
    const all: Transaction[] = [];
    // Guard bounds runaway paging if a backend ever returns a self-referential cursor.
    for (let guard = 0; guard < 10000; guard += 1) {
      const data = await apiRequest<TransactionsPage | Transaction[]>(path, {
        requireAuth: true,
        signal: params?.signal,
      });
      if (Array.isArray(data)) {
        all.push(...data); // ?limit= bypass → plain array, single request
        break;
      }
      all.push(...(data.results ?? []));
      if (!data.next) break;
      path = toRelativeCursorPath(data.next);
    }
    return all;
  },
  /** One cursor-paginated page ({ results, next, previous }) for infinite scroll. */
  listPage: (
    params?: { category?: string; direction?: string; date_from?: string; date_to?: string; page_size?: number; cursor?: string; signal?: AbortSignal; }
  ) =>
    apiRequest<TransactionsPage>(`/api/transactions/${buildTransactionQuery(params)}`, {
      requireAuth: true,
      signal: params?.signal,
    }),
  /** Follow a `next`/`previous` URL returned by listPage. */
  listMore: (cursorUrl: string, signal?: AbortSignal) =>
    apiRequest<TransactionsPage>(toRelativeCursorPath(cursorUrl), { requireAuth: true, signal }),
  create: (data: NewTransaction) =>
    apiRequest<Transaction>("/api/transactions/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ ...data, currency: "USD", payment_channel: "card" }),
      audit: { eventName: "transaction.create", action: "create", resourceType: "transaction" },
    }),
  update: (id: number, data: Partial<NewTransaction>) =>
    apiRequest<Transaction>(`/api/transactions/${id}/`, {
      requireAuth: true,
      method: "PUT",
      body: JSON.stringify(data),
      audit: { eventName: "transaction.update", action: "update", resourceType: "transaction", resourceId: id },
    }),
  patch: (id: number, data: Partial<NewTransaction> | Partial<TransactionFeedbackPayload>) =>
    apiRequest<Transaction>(`/api/transactions/${id}/`, {
      requireAuth: true,
      method: "PATCH",
      body: JSON.stringify(data),
      audit: { eventName: "transaction.update", action: "update", resourceType: "transaction", resourceId: id },
    }),
  /** Submit transaction-level feedback for ML pipeline. Uses PATCH. */
  submitFeedback: (id: number, payload: TransactionFeedbackPayload) =>
    apiRequest<Transaction>(`/api/transactions/${id}/`, {
      requireAuth: true,
      method: "PATCH",
      body: JSON.stringify(payload),
      audit: { eventName: "transaction.feedback", action: "update_feedback", resourceType: "transaction", resourceId: id },
    }),
  score: (id: number) =>
    apiRequest<Transaction>(`/api/transactions/${id}/score/`, {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({}),
      audit: { eventName: "transaction.score", action: "score", resourceType: "transaction", resourceId: id },
    }),
  remove: (id: number) =>
    apiRequest<null>(`/api/transactions/${id}/`, {
      requireAuth: true,
      method: "DELETE",
      audit: { eventName: "transaction.delete", action: "delete", resourceType: "transaction", resourceId: id },
    }),
};
