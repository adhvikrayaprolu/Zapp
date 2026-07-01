import * as React from "react";
import { TransactionsAPI, type Transaction } from "@/api/transactions.api";
import { BankingAPI, type BankTransaction } from "@/api/banking.api";
import { parseDateForDisplay } from "@/shared/date";
import {
  normalizeBankTransaction,
  type DisplayTransaction,
} from "../utils/normalizeBankTransaction";

export type MergedTransactionsFilters = {
  category?: string;
  direction?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
};

export function useMergedTransactions(filters: MergedTransactionsFilters = {}) {
  const [manualTx, setManualTx] = React.useState<Transaction[]>([]);
  const [bankTx, setBankTx] = React.useState<BankTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [manualOutcome, bankOutcome] = await Promise.allSettled([
        TransactionsAPI.list({
          category: filters.category,
          direction: filters.direction,
          date_from: filters.date_from,
          date_to: filters.date_to,
          limit: filters.limit,
        }),
        BankingAPI.getTransactions({
          category: filters.category,
          direction: filters.direction,
          date_from: filters.date_from,
          date_to: filters.date_to,
          limit: filters.limit ?? 500,
        }),
      ]);

      let manual: Transaction[] = [];
      let bank: BankTransaction[] = [];
      const failures: string[] = [];

      if (manualOutcome.status === "fulfilled") {
        const v = manualOutcome.value;
        manual = Array.isArray(v) ? v : [];
      } else {
        const r = manualOutcome.reason;
        failures.push(r instanceof Error ? r.message : "Manual transactions could not be loaded.");
      }

      if (bankOutcome.status === "fulfilled") {
        const v = bankOutcome.value;
        bank = Array.isArray(v) ? v : [];
      } else {
        const r = bankOutcome.reason;
        failures.push(r instanceof Error ? r.message : "Bank transactions could not be loaded.");
      }

      setManualTx(manual);
      setBankTx(bank);

      if (failures.length === 2) {
        setError(failures.join(" "));
      } else if (failures.length === 1) {
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
      setManualTx([]);
      setBankTx([]);
    } finally {
      setLoading(false);
    }
  }, [
    filters.category,
    filters.direction,
    filters.date_from,
    filters.date_to,
    filters.limit,
  ]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onRefetch = () => {
      void refetch();
    };
    window.addEventListener("zapp-transactions-refetch", onRefetch);
    return () => window.removeEventListener("zapp-transactions-refetch", onRefetch);
  }, [refetch]);

  const merged: DisplayTransaction[] = React.useMemo(() => {
    const manual: DisplayTransaction[] = manualTx.map((t) => ({
      id: t.id,
      description_raw: t.description_raw,
      occurred_at: t.occurred_at,
      amount: t.amount,
      direction: t.direction,
      category: t.category,
      impulse_score: t.impulse_score,
      regret_score: t.regret_score,
      satisfaction_rating: t.satisfaction_rating,
      regret_rating: t.regret_rating ?? null,
      repurchase_likelihood: t.repurchase_likelihood ?? null,
      usage_frequency: t.usage_frequency ?? null,
      reflection_text: t.reflection_text ?? null,
      considered_at: t.considered_at ?? null,
      feedback_value_score: t.feedback_value_score ?? null,
      value_score: t.value_score ?? null,
      value_score_source: t.value_score_source ?? null,
      personal_value_score: null,
      value_score_confidence: t.value_score_confidence ?? null,
      value_score_model_version: null,
      value_score_computed_at: t.value_score_computed_at ?? null,
      source: "manual" as const,
    }));
    const bank: DisplayTransaction[] = bankTx.map(normalizeBankTransaction);
    const sorted = [...manual, ...bank].sort(
      (a, b) => parseDateForDisplay(b.occurred_at).getTime() - parseDateForDisplay(a.occurred_at).getTime()
    );
    return filters.limit ? sorted.slice(0, filters.limit) : sorted;
  }, [manualTx, bankTx, filters.limit]);

  return { transactions: merged, loading, error, refetch };
}
