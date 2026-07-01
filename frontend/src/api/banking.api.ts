import { apiRequest } from "./client";
import type { TransactionFeedbackPayload } from "./transactions.api";

export type BankConnection = {
  id: string | number;
  plaid_item_id?: string;
  institution_id?: string;
  institution_name?: string;
  institution?: string;
  status?: string;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BankAccount = {
  id: string;
  connection_id?: string;
  name?: string;
  type?: string;
  subtype?: string;
  mask?: string;
  current_balance?: number | string | null;
  available_balance?: number | string | null;
};

export type BankTransaction = {
  id: string;
  account_id?: string;
  amount: string | number;
  date?: string;
  occurred_at?: string;
  name?: string;
  merchant_name?: string;
  description_raw?: string;
  direction?: string;
  category?: string;
  personal_value_score?: number | null;
  value_score_confidence?: number | null;
  value_score_model_version?: string | null;
  value_score_computed_at?: string | null;
};

export type ExchangePublicTokenResponse = {
  success: boolean;
  connection: BankConnection;
};

export const BankingAPI = {
  /** Prefer calling only via `usePlaidConnect` → `useSecureBankConnect` so MFA + consent run first. */
  createLinkToken: () =>
    apiRequest<{ link_token: string }>("/api/banking/link-token/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({}),
      audit: {
        eventName: "bank.link_token.create",
        action: "create_link_token",
        resourceType: "bank_connection",
      },
    }),

  exchangePublicToken: (publicToken: string) =>
    apiRequest<ExchangePublicTokenResponse>("/api/banking/exchange-token/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ public_token: publicToken }),
      audit: {
        eventName: "bank.connection.link",
        action: "exchange_public_token",
        resourceType: "bank_connection",
      },
    }),

  getConnections: () =>
    apiRequest<BankConnection[]>("/api/banking/connections/", {
      requireAuth: true,
      audit: { eventName: "bank.connections.read", action: "read", resourceType: "bank_connection" },
    }),

  getAccounts: () =>
    apiRequest<BankAccount[]>("/api/banking/accounts/", {
      requireAuth: true,
      audit: { eventName: "bank.accounts.read", action: "read", resourceType: "bank_account" },
    }),

  getTransactions: (params?: {
    limit?: number;
    date_from?: string;
    date_to?: string;
    category?: string;
    direction?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);
    if (params?.category) query.set("category", params.category);
    if (params?.direction) query.set("direction", params.direction);
    const qs = query.toString();
    return apiRequest<BankTransaction[]>(
      `/api/banking/transactions/${qs ? `?${qs}` : ""}`,
      {
        requireAuth: true,
        audit: { eventName: "bank.transactions.read", action: "read", resourceType: "bank_transaction" },
      }
    );
  },

  syncConnection: (connectionId: string) =>
    apiRequest<{ ok?: boolean }>(`/api/banking/connections/${connectionId}/sync/`, {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({}),
      audit: {
        eventName: "bank.connection.sync",
        action: "sync",
        resourceType: "bank_connection",
        resourceId: connectionId,
      },
    }),

  /** Submit feedback for a bank-synced transaction. Uses same payload shape as manual transactions. */
  submitFeedback: (plaidTransactionId: string, payload: TransactionFeedbackPayload) =>
    apiRequest<BankTransaction>(`/api/banking/transactions/${plaidTransactionId}/`, {
      requireAuth: true,
      method: "PATCH",
      body: JSON.stringify(payload),
      audit: {
        eventName: "bank.transaction.feedback",
        action: "update_feedback",
        resourceType: "bank_transaction",
        resourceId: plaidTransactionId,
      },
    }),
  score: (transactionId: string | number) =>
    apiRequest<BankTransaction>(`/api/banking/transactions/${transactionId}/score/`, {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({}),
      audit: {
        eventName: "bank.transaction.score",
        action: "score",
        resourceType: "bank_transaction",
        resourceId: transactionId,
      },
    }),
};
