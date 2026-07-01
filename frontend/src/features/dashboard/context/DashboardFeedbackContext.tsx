import * as React from "react";
import type { DisplayTransaction } from "@/features/transactions/utils/normalizeBankTransaction";
import { TransactionFeedbackModal } from "@/features/transactions/components/TransactionFeedbackModal";

export type DashboardFeedbackSource = "manual" | "prompt";

type DashboardFeedbackContextValue = {
  feedbackTransaction: DisplayTransaction | null;
  feedbackSource: DashboardFeedbackSource | null;
  openFeedback: (tx: DisplayTransaction, source: DashboardFeedbackSource) => void;
  closeFeedback: () => void;
  registerPromptCloseHandler: (fn: (() => void) | null) => void;
  registerPromptFeedbackSaved: (fn: ((transactionId: string | number) => void) | null) => void;
};

const DashboardFeedbackContext = React.createContext<DashboardFeedbackContextValue | null>(null);

export function useDashboardFeedback(): DashboardFeedbackContextValue {
  const ctx = React.useContext(DashboardFeedbackContext);
  if (!ctx) {
    throw new Error("useDashboardFeedback must be used within DashboardFeedbackProvider");
  }
  return ctx;
}

export function DashboardFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [feedbackTransaction, setFeedbackTransaction] = React.useState<DisplayTransaction | null>(null);
  const [feedbackSource, setFeedbackSource] = React.useState<DashboardFeedbackSource | null>(null);
  const feedbackTransactionRef = React.useRef<DisplayTransaction | null>(null);
  const feedbackSourceRef = React.useRef<DashboardFeedbackSource | null>(null);
  const promptCloseHandlerRef = React.useRef<(() => void) | null>(null);
  const promptFeedbackSavedRef = React.useRef<((transactionId: string | number) => void) | null>(null);
  /** Modal calls onSubmitted then onOpenChange(false); skip duplicate close handling. */
  const skipNextCloseFromSubmitRef = React.useRef(false);

  React.useEffect(() => {
    feedbackSourceRef.current = feedbackSource;
  }, [feedbackSource]);

  React.useEffect(() => {
    feedbackTransactionRef.current = feedbackTransaction;
  }, [feedbackTransaction]);

  const registerPromptCloseHandler = React.useCallback((fn: (() => void) | null) => {
    promptCloseHandlerRef.current = fn;
  }, []);

  const registerPromptFeedbackSaved = React.useCallback(
    (fn: ((transactionId: string | number) => void) | null) => {
      promptFeedbackSavedRef.current = fn;
    },
    []
  );

  const openFeedback = React.useCallback((tx: DisplayTransaction, source: DashboardFeedbackSource) => {
    setFeedbackTransaction(tx);
    setFeedbackSource(source);
    feedbackSourceRef.current = source;
    feedbackTransactionRef.current = tx;
  }, []);

  const runPromptAdvanceIfNeeded = React.useCallback((src: DashboardFeedbackSource | null) => {
    if (src === "prompt" && promptCloseHandlerRef.current) {
      promptCloseHandlerRef.current();
    }
  }, []);

  const closeFeedback = React.useCallback(() => {
    const src = feedbackSourceRef.current;
    setFeedbackTransaction(null);
    setFeedbackSource(null);
    feedbackSourceRef.current = null;
    feedbackTransactionRef.current = null;
    runPromptAdvanceIfNeeded(src);
  }, [runPromptAdvanceIfNeeded]);

  const onSubmitted = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zapp-transactions-refetch"));
    }
    skipNextCloseFromSubmitRef.current = true;
    const src = feedbackSourceRef.current;
    const tx = feedbackTransactionRef.current;
    if (src === "prompt" && tx) {
      promptFeedbackSavedRef.current?.(tx.id);
    }
    setFeedbackTransaction(null);
    setFeedbackSource(null);
    feedbackSourceRef.current = null;
    feedbackTransactionRef.current = null;
    runPromptAdvanceIfNeeded(src);
  }, [runPromptAdvanceIfNeeded]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        if (skipNextCloseFromSubmitRef.current) {
          skipNextCloseFromSubmitRef.current = false;
          return;
        }
        closeFeedback();
      }
    },
    [closeFeedback]
  );

  const value = React.useMemo(
    () => ({
      feedbackTransaction,
      feedbackSource,
      openFeedback,
      closeFeedback,
      registerPromptCloseHandler,
      registerPromptFeedbackSaved,
    }),
    [
      feedbackTransaction,
      feedbackSource,
      openFeedback,
      closeFeedback,
      registerPromptCloseHandler,
      registerPromptFeedbackSaved,
    ]
  );

  return (
    <DashboardFeedbackContext.Provider value={value}>
      {children}
      <TransactionFeedbackModal
        transaction={feedbackTransaction}
        open={!!feedbackTransaction}
        onOpenChange={handleOpenChange}
        onSubmitted={onSubmitted}
      />
    </DashboardFeedbackContext.Provider>
  );
}
