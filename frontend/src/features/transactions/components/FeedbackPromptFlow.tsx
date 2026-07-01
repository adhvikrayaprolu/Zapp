import * as React from "react";
import { useLocation } from "react-router-dom";
import { TransactionsAPI, type FeedbackCandidate } from "@/api/transactions.api";
import { useAuth } from "@/features/auth";
import { useDashboardFeedback } from "@/features/dashboard/context/DashboardFeedbackContext";
import { useMergedTransactions } from "../hooks/useMergedTransactions";
import type { DisplayTransaction } from "../utils/normalizeBankTransaction";

const MAX_PROMPTS_PER_SESSION = 2;
const TRANSACTION_POOL_LIMIT = 300;

const DAILY_STORAGE_PREFIX = "zapp-feedback-daily-prompt";
const SESSION_STORAGE_PREFIX = "zapp-feedback-session-prompt";

function dailyPromptKey(userId: string | number | undefined): string | null {
  if (userId == null) return null;
  return `${DAILY_STORAGE_PREFIX}-${userId}`;
}

function sessionPromptKey(userId: string | number | undefined): string | null {
  if (userId == null) return null;
  return `${SESSION_STORAGE_PREFIX}-${userId}`;
}

function getTodayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function hasFeedback(tx: DisplayTransaction): boolean {
  return (
    tx.satisfaction_rating != null ||
    tx.considered_at != null ||
    (tx.regret_rating != null && tx.repurchase_likelihood != null) ||
    (tx.reflection_text?.trim().length ?? 0) > 0
  );
}

function matchTransaction(
  candidates: FeedbackCandidate[],
  transactions: DisplayTransaction[],
  answeredThisSession: Set<string | number>
): DisplayTransaction[] {
  const byId = new Map<string | number, DisplayTransaction>();
  for (const tx of transactions) {
    byId.set(tx.id, tx);
    if (typeof tx.id === "string" && tx.id.startsWith("bank-")) {
      byId.set(tx.id.slice(5), tx);
    }
  }
  const seen = new Set<string | number>();
  const queue: DisplayTransaction[] = [];
  for (const c of candidates) {
    const id = c.transaction_id;
    if (seen.has(id)) continue;
    const tx =
      byId.get(id) ?? (typeof id === "string" ? byId.get(`bank-${id}`) : undefined);
    if (!tx) continue;
    if (seen.has(tx.id)) continue;
    seen.add(tx.id);
    if (hasFeedback(tx)) continue;
    if (answeredThisSession.has(tx.id)) continue;
    queue.push(tx);
    if (queue.length >= MAX_PROMPTS_PER_SESSION) break;
  }
  return queue;
}

/**
 * Fetches feedback candidates on the dashboard home route and opens the shared
 * dashboard feedback modal at most once per local day for the first prompt
 * (per user). The first prompt is also suppressed after a reload within the same
 * tab session; further prompts in the same live visit are not blocked by storage.
 */
export function FeedbackPromptFlow() {
  const { pathname } = useLocation();
  const isOnHome = pathname === "/home";
  const { user } = useAuth();
  const { feedbackTransaction, openFeedback, registerPromptCloseHandler, registerPromptFeedbackSaved } =
    useDashboardFeedback();

  const { transactions, loading: txLoading } = useMergedTransactions({
    limit: TRANSACTION_POOL_LIMIT,
  });

  const [candidates, setCandidates] = React.useState<FeedbackCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = React.useState(false);
  const [queue, setQueue] = React.useState<DisplayTransaction[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answeredThisSession, setAnsweredThisSession] = React.useState<
    Set<string | number>
  >(() => new Set());
  const hasFetchedCandidates = React.useRef(false);
  const openedPromptForIndexRef = React.useRef<number | null>(null);
  /** After any prompt open in this tab session, allow follow-up prompts without re-checking daily storage. */
  const openedPromptInSessionRef = React.useRef(false);

  const advanceToNext = React.useCallback(() => {
    setCurrentIndex((i) => {
      const next = i + 1;
      if (next >= queue.length) {
        setQueue([]);
        openedPromptForIndexRef.current = null;
        return 0;
      }
      openedPromptForIndexRef.current = null;
      return next;
    });
  }, [queue.length]);

  React.useEffect(() => {
    registerPromptCloseHandler(advanceToNext);
    return () => registerPromptCloseHandler(null);
  }, [registerPromptCloseHandler, advanceToNext]);

  React.useEffect(() => {
    registerPromptFeedbackSaved((transactionId) => {
      setAnsweredThisSession((prev) => new Set(prev).add(transactionId));
    });
    return () => registerPromptFeedbackSaved(null);
  }, [registerPromptFeedbackSaved]);

  React.useEffect(() => {
    if (!isOnHome || hasFetchedCandidates.current) return;
    hasFetchedCandidates.current = true;
    setCandidatesLoading(true);
    TransactionsAPI.getFeedbackCandidates()
      .then((data) => setCandidates(Array.isArray(data) ? data : []))
      .catch(() => setCandidates([]))
      .finally(() => setCandidatesLoading(false));
  }, [isOnHome]);

  React.useEffect(() => {
    if (!isOnHome || candidatesLoading || txLoading) return;
    if (candidates.length === 0) return;
    const q = matchTransaction(candidates, transactions, answeredThisSession);
    setQueue(q);
    setCurrentIndex(0);
    openedPromptForIndexRef.current = null;
  }, [isOnHome, candidates, candidatesLoading, txLoading, transactions, answeredThisSession]);

  const tryBrowserNotification = React.useCallback((tx: DisplayTransaction) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification("Reflect on a purchase", {
        body: (tx.description_raw || "A transaction").slice(0, 120),
        tag: "zapp-feedback-prompt",
      });
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (!isOnHome || candidatesLoading || txLoading) return;
    if (user?.id == null) return;
    if (feedbackTransaction) return;
    if (queue.length === 0 || currentIndex >= queue.length) return;

    const key = dailyPromptKey(user.id);
    const sessionKey = sessionPromptKey(user.id);
    const today = getTodayLocal();

    if (!openedPromptInSessionRef.current) {
      if (sessionKey && typeof sessionStorage !== "undefined" && sessionStorage.getItem(sessionKey) === today) {
        return;
      }
      if (key && typeof localStorage !== "undefined" && localStorage.getItem(key) === today) {
        return;
      }
    }

    if (openedPromptForIndexRef.current === currentIndex) return;

    const tx = queue[currentIndex];
    if (!tx) return;

    openedPromptForIndexRef.current = currentIndex;
    if (!openedPromptInSessionRef.current) {
      if (sessionKey && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(sessionKey, today);
      }
      if (key && typeof localStorage !== "undefined") {
        localStorage.setItem(key, today);
      }
    }
    openedPromptInSessionRef.current = true;

    openFeedback(tx, "prompt");
    tryBrowserNotification(tx);
  }, [
    isOnHome,
    candidatesLoading,
    txLoading,
    feedbackTransaction,
    queue,
    currentIndex,
    openFeedback,
    user?.id,
    tryBrowserNotification,
  ]);

  return null;
}
