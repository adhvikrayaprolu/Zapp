import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/api/client";
import {
  GamificationAPI,
  type PeriodicReview,
  type ReviewOverview,
  type ReviewSubscription,
} from "@/api/gamification.api";
import type { Transaction } from "@/api/transactions.api";
import { ElectricCard } from "@/features/home/components/ElectricCard";
import { TransactionFeedbackModal } from "@/features/transactions/components/TransactionFeedbackModal";
import type { DisplayTransaction } from "@/features/transactions/utils/normalizeBankTransaction";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/components/ui/utils";
import { COLORS } from "@/shared/theme";
import { normalizeModelValueScore } from "@/shared/valuation";

type ReviewKind = "weekly" | "monthly";

// Shared token-based treatments so light/dark both read cleanly.
const SUCCESS_PILL =
  "border-[color:color-mix(in_srgb,var(--app-color-status-success)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-color-status-success)_12%,transparent)] text-[var(--app-color-status-success)]";
const WARNING_PILL =
  "border-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_12%,transparent)] text-[var(--app-accent-yellow-soft)]";
const INSET_SURFACE =
  "border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)]";

const REVIEW_THEME: Record<
  ReviewKind,
  {
    title: string;
    eyebrow: string;
    accent: string;
    heroCard: string;
    surfaceCard: string;
    pill: string;
    progress: string;
    summaryTitle: string;
    summaryDescription: string;
    transactionTitle: string;
    transactionDescription: string;
  }
> = {
  weekly: {
    title: "Weekly Review",
    eyebrow: "Weekly Reset",
    accent: COLORS.electricGreen,
    heroCard:
      "from-[color:color-mix(in_srgb,var(--app-accent-green-soft)_22%,transparent)] via-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_12%,transparent)] to-transparent",
    surfaceCard: "border-[color:color-mix(in_srgb,var(--app-accent-green-soft)_22%,transparent)]",
    pill: SUCCESS_PILL,
    progress: "from-[var(--app-accent-green-soft)] via-[var(--app-accent-cyan-soft)] to-[var(--app-accent-teal-soft)]",
    summaryTitle: "Lock the lesson in",
    summaryDescription:
      "One win, one miss, and one adjustment for next week.",
    transactionTitle: "Purchases to review",
    transactionDescription:
      "The purchases that mattered most this week.",
  },
  monthly: {
    title: "Monthly Review",
    eyebrow: "Monthly Audit",
    accent: COLORS.electricBlue,
    heroCard:
      "from-[color:color-mix(in_srgb,var(--app-accent-blue-soft)_22%,transparent)] via-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_12%,transparent)] to-transparent",
    surfaceCard: "border-[color:color-mix(in_srgb,var(--app-accent-blue-soft)_22%,transparent)]",
    pill: "border-[color:color-mix(in_srgb,var(--app-accent-blue-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-blue-soft)_12%,transparent)] text-[var(--app-accent-blue-soft)]",
    progress: "from-[var(--app-accent-blue-soft)] via-[var(--app-accent-cyan-soft)] to-[var(--app-accent-purple-soft)]",
    summaryTitle: "Close the month with signal",
    summaryDescription:
      "The best call, the miss, and next month's focus.",
    transactionTitle: "Purchases to review",
    transactionDescription:
      "Start with the biggest purchases, then subscriptions.",
  },
};

const FIELD_COPY: Record<string, { label: string; placeholder: string }> = {
  wins: {
    label: "Biggest win",
    placeholder: "One spending choice to keep.",
  },
  regrets: {
    label: "Biggest miss",
    placeholder: "One purchase or pattern to rethink.",
  },
  adjustment: {
    label: "Next adjustment",
    placeholder: "One change for next week.",
  },
  best_purchase: {
    label: "Best purchase",
    placeholder: "Which purchase delivered the most value?",
  },
  most_regretted_purchase: {
    label: "Most regretted purchase",
    placeholder: "Which purchase missed the mark?",
  },
  next_month_focus: {
    label: "Next month focus",
    placeholder: "What needs the most attention next month?",
  },
};

const MISSING_COPY: Record<string, string> = {
  reviewed_transactions: "Review enough purchases first.",
  wins: "Add your biggest win.",
  regrets: "Add your biggest miss.",
  adjustment: "Add one next step.",
  best_purchase: "Add your best purchase.",
  most_regretted_purchase: "Add your most regretted purchase.",
  next_month_focus: "Add next month's focus.",
};

function formatMissingRequirement(code: string) {
  return MISSING_COPY[code] ?? code.replace(/_/g, " ");
}

function formatCategoryLabel(code: string) {
  return code.replace(/_/g, " ");
}

function toDisplayTransaction(transaction: Transaction): DisplayTransaction {
  return {
    ...transaction,
    source: "manual",
  };
}

function parseApiErrorResponse(error: unknown): { detail?: string; missing_requirements?: string[] } | null {
  if (!(error instanceof ApiError) || !error.rawBody) return null;
  try {
    return JSON.parse(error.rawBody) as { detail?: string; missing_requirements?: string[] };
  } catch {
    return null;
  }
}

function currencyAmount(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function statusTone(review: PeriodicReview) {
  return review.status === "completed" ? SUCCESS_PILL : WARNING_PILL;
}

function currentDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function effectiveReviewEnd(review: PeriodicReview) {
  const today = currentDateKey();
  return review.period_end < today ? review.period_end : today;
}

function occursInReviewWindow(transaction: Transaction, review: PeriodicReview) {
  const occurredOn = transaction.occurred_at.slice(0, 10);
  return occurredOn >= review.period_start && occurredOn <= effectiveReviewEnd(review);
}

function formatDateLabel(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function hasReviewFeedback(transaction: Transaction) {
  return (
    transaction.satisfaction_rating != null ||
    transaction.regret_rating != null ||
    transaction.repurchase_likelihood != null ||
    (transaction.reflection_text?.trim().length ?? 0) > 0
  );
}

export function ReviewPage({ kind }: { kind: ReviewKind }) {
  const [overview, setOverview] = React.useState<ReviewOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState<DisplayTransaction | null>(null);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [summary, setSummary] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState("");
  const [missingRequirements, setMissingRequirements] = React.useState<string[]>([]);

  const loadReview = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = kind === "weekly"
        ? await GamificationAPI.getWeeklyReview()
        : await GamificationAPI.getMonthlyReview();
      setOverview(data);
      setSummary(
        Object.fromEntries(
          data.summary_requirements.map((field) => [field, String(data.review.summary_json?.[field] ?? "")]),
        ),
      );
      setNotes(data.review.notes ?? "");
      setMissingRequirements([]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load review.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  React.useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const openFeedback = (transaction: Transaction) => {
    setSelectedTransaction(toDisplayTransaction(transaction));
    setFeedbackOpen(true);
  };

  const handleComplete = async () => {
    if (!overview || submitting) return;

    try {
      setSubmitting(true);
      const payload = kind === "weekly"
        ? await GamificationAPI.completeWeeklyReviewFlow(summary, { notes: notes.trim() || undefined })
        : await GamificationAPI.completeMonthlyReviewFlow(summary, { notes: notes.trim() || undefined });
      setOverview(payload);
      setMissingRequirements(payload.missing_requirements ?? []);
      toast.success(
        payload.point_event
          ? `${kind === "weekly" ? "Weekly" : "Monthly"} review complete. +${payload.point_event.points} points`
          : "Review completed.",
      );
    } catch (error) {
      console.error(error);
      const parsed = parseApiErrorResponse(error);
      if (parsed?.missing_requirements?.length) {
        setMissingRequirements(parsed.missing_requirements);
      }
      toast.error(parsed?.detail ?? (error instanceof Error ? error.message : "Failed to complete review."));
    } finally {
      setSubmitting(false);
    }
  };

  const theme = REVIEW_THEME[kind];
  const accent = theme.accent;

  if (loading) {
    return (
      <ElectricCard semanticColor={accent} elevation={1}>
        <div className="py-16 text-center text-xs font-black uppercase tracking-[0.3em] text-[var(--app-color-text-tertiary)]">
          Loading {kind} review...
        </div>
      </ElectricCard>
    );
  }

  if (!overview) {
    return (
      <ElectricCard semanticColor={COLORS.electricYellow} elevation={1}>
        <div className="space-y-3">
          <div className="text-sm font-black uppercase tracking-[0.24em] text-[var(--app-color-text-tertiary)]">{theme.title}</div>
          <div className="text-2xl font-black text-[var(--app-color-text-primary)]">Could not load review data</div>
          <div className="text-sm text-[var(--app-color-text-tertiary)]">
            Try refreshing the page once the backend is available again.
          </div>
          <Button
            onClick={() => void loadReview()}
            className="rounded-2xl"
            style={{ backgroundColor: "var(--app-color-action-primary-bg)", color: "var(--app-color-action-primary-fg)" }}
          >
            Retry
          </Button>
        </div>
      </ElectricCard>
    );
  }

  const review = overview.review;
  const requiredTransactions = Math.max(overview.minimum_transactions_required, 1);
  const reviewedProgress = Math.min(
    overview.reviewed_transaction_count / requiredTransactions,
    1,
  );
  const filledSummaryFields = overview.summary_requirements.filter(
    (field) => summary[field]?.trim(),
  ).length;
  const summaryProgress =
    overview.summary_requirements.length === 0
      ? 1
      : filledSummaryFields / overview.summary_requirements.length;
  const overallProgress = Math.round(
    (((reviewedProgress * 0.55) + (summaryProgress * 0.45)) || 0) * 100,
  );
  const scopedTransactions = overview.transaction_candidates.filter((transaction) =>
    occursInReviewWindow(transaction, review),
  );
  const reviewScopeLabel = `${formatDateLabel(review.period_start)} - ${formatDateLabel(effectiveReviewEnd(review))}`;
  const outstandingRequirements = [
    ...(missingRequirements.length > 0
      ? missingRequirements
      : overview.summary_requirements.filter((field) => !summary[field]?.trim())),
  ];

  if (
    !outstandingRequirements.includes("reviewed_transactions") &&
    overview.reviewed_transaction_count < overview.minimum_transactions_required
  ) {
    outstandingRequirements.unshift("reviewed_transactions");
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-strong)] p-6 sm:p-8">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br",
            theme.heroCard,
          )}
        />
        <div className="pointer-events-none absolute -right-16 top-0 h-44 w-44 rounded-full bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_16%,transparent)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_12%,transparent)] blur-3xl" />

        <div className="relative space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-4">
              <Link
                to="/home"
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--app-color-text-tertiary)] transition-colors hover:text-[var(--app-accent-cyan-soft)]"
              >
                <ArrowLeft size={14} />
                Back to dashboard
              </Link>
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-[0.32em] text-[var(--app-accent-cyan-soft)]">
                  {theme.eyebrow}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tight text-[var(--app-color-text-primary)] sm:text-5xl">
                    {theme.title}
                  </h1>
                  <div
                    className={cn(
                      "rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em]",
                      statusTone(review),
                    )}
                  >
                    {review.status === "completed" ? "Completed" : "Open"}
                  </div>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-[var(--app-color-text-secondary)]">
                  {overview.period_label}. Review purchases, then finish the summary.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "min-w-[220px] rounded-[1.8rem] border bg-[var(--app-color-surface-overlay)] p-5 backdrop-blur",
                theme.surfaceCard,
              )}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--app-color-text-tertiary)]">
                Completion progress
              </div>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div className="text-5xl font-black tracking-tight text-[var(--app-color-text-primary)]">
                  {overallProgress}%
                </div>
                <div
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]",
                    theme.pill,
                  )}
                >
                  {overview.eligible_to_complete ? "Ready to submit" : "In progress"}
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--app-color-surface-inset)]">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                    theme.progress,
                  )}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="mt-3 text-xs font-bold leading-5 text-[var(--app-color-text-tertiary)]">
                {review.status === "completed"
                  ? "This review is complete."
                  : overview.eligible_to_complete
                    ? "Ready to submit."
                    : "Finish the queue and summary."}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <HeroMetricCard
              label="Reviewed purchases"
              value={String(overview.reviewed_transaction_count)}
              note={`Need ${overview.minimum_transactions_required} total`}
            />
            <HeroMetricCard
              label="Pending"
              value={String(overview.pending_transaction_feedback_count)}
              note="Waiting for feedback"
            />
            <HeroMetricCard
              label="Summary"
              value={`${filledSummaryFields}/${overview.summary_requirements.length}`}
              note="Questions answered"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ElectricCard semanticColor={accent} elevation={1} className="overflow-hidden">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={18} style={{ color: accent }} />
                <h2 className="text-lg font-black text-[var(--app-color-text-primary)]">Review map</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--app-color-text-tertiary)]">
                See what's left before you submit.
              </p>
            </div>
            <div
              className={cn(
                "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]",
                theme.pill,
              )}
            >
              {kind}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <div className={cn("rounded-[1.8rem] p-5", INSET_SURFACE)}>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--app-color-text-tertiary)]">
                Checklist
              </div>
              <div className="mt-4 space-y-3">
                <ChecklistRow
                  done={
                    overview.reviewed_transaction_count >=
                    overview.minimum_transactions_required
                  }
                  title="Review purchases"
                  description={`${overview.reviewed_transaction_count} of ${overview.minimum_transactions_required}`}
                />
                {overview.summary_requirements.map((field) => (
                  <ChecklistRow
                    key={field}
                    done={Boolean(summary[field]?.trim())}
                    title={FIELD_COPY[field]?.label ?? formatCategoryLabel(field)}
                    description={summary[field]?.trim() ? "Done" : "Missing"}
                  />
                ))}
              </div>
            </div>

            <div className={cn("rounded-[1.8rem] p-5", INSET_SURFACE)}>
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--app-color-text-primary)]">
                <Clock3 size={16} className="text-[var(--app-accent-yellow-soft)]" />
                Still needed
              </div>
              {outstandingRequirements.length === 0 ? (
                <div className={cn("rounded-[1.4rem] p-4 text-sm font-bold leading-6", SUCCESS_PILL)}>
                  Everything is in place. Submit when ready.
                </div>
              ) : (
                <div className="space-y-3">
                  {outstandingRequirements.map((requirement) => (
                    <div
                      key={requirement}
                      className={cn("rounded-[1.4rem] border px-4 py-3 text-sm font-bold leading-6", WARNING_PILL)}
                    >
                      {formatMissingRequirement(requirement)}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MiniStat
                  label="Review status"
                  value={review.status === "completed" ? "Completed" : "Open"}
                />
                <MiniStat label="Period label" value={overview.period_label} />
              </div>
            </div>
          </div>
        </ElectricCard>

        <ElectricCard
          semanticColor={COLORS.electricPurple}
          elevation={1}
          className="overflow-hidden"
        >
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[var(--app-accent-purple-soft)]" />
              <h2 className="text-lg font-black text-[var(--app-color-text-primary)]">
                {theme.summaryTitle}
              </h2>
            </div>
            <p className="text-sm leading-6 text-[var(--app-color-text-tertiary)]">
              {theme.summaryDescription}
            </p>
          </div>
          <div className="space-y-4">
            {overview.summary_requirements.map((field) => {
              const copy = FIELD_COPY[field] ?? {
                label: field.replace(/_/g, " "),
                placeholder: "Add a note.",
              };
              const filled = Boolean(summary[field]?.trim());
              return (
                <div
                  key={field}
                  className={cn(
                    "rounded-[1.6rem] border p-4 transition-colors",
                    filled
                      ? "border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_6%,transparent)]"
                      : "border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)]",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--app-color-text-secondary)]">
                      {copy.label}
                    </label>
                    <div
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em]",
                        filled
                          ? SUCCESS_PILL
                          : "border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-base)] text-[var(--app-color-text-tertiary)]",
                      )}
                    >
                      {filled ? "Done" : "Needed"}
                    </div>
                  </div>
                  <textarea
                    value={summary[field] ?? ""}
                    onChange={(event) =>
                      setSummary((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    rows={4}
                    className="app-input w-full rounded-[1.2rem] px-4 py-3 text-sm font-medium leading-6 outline-none transition-colors focus:border-[var(--app-color-border-focus)]"
                    placeholder={copy.placeholder}
                  />
                </div>
              );
            })}
            <div className={cn("rounded-[1.6rem] p-4", INSET_SURFACE)}>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[var(--app-color-text-secondary)]">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="app-input w-full rounded-[1.2rem] px-4 py-3 text-sm font-medium leading-6 outline-none transition-colors focus:border-[var(--app-color-border-focus)]"
                placeholder="Optional notes."
              />
            </div>
            <Button
              onClick={handleComplete}
              disabled={submitting || review.status === "completed"}
              className="h-14 w-full rounded-[1.2rem] text-sm font-black uppercase tracking-[0.18em]"
              style={{ backgroundColor: "var(--app-color-action-primary-bg)", color: "var(--app-color-action-primary-fg)" }}
            >
              {review.status === "completed"
                ? "Review completed"
                : submitting
                  ? "Submitting..."
                  : `Complete ${kind} review`}
            </Button>
          </div>
        </ElectricCard>
      </div>

      <ElectricCard
        semanticColor={COLORS.electricCyan}
        elevation={1}
        className="overflow-hidden"
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-[var(--app-accent-cyan-soft)]" />
              <h2 className="text-lg font-black text-[var(--app-color-text-primary)]">
                {theme.transactionTitle}
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-color-text-tertiary)]">
              {theme.transactionDescription}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--app-color-text-tertiary)]">
              Showing {reviewScopeLabel} purchases only
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadReview()}
            className="rounded-2xl border-[var(--app-color-border-strong)]"
          >
            <RefreshCw size={14} className="mr-2" />
            Refresh
          </Button>
        </div>
        {scopedTransactions.length === 0 ? (
          <div className={cn("rounded-[1.8rem] p-8 text-sm font-bold leading-6 text-[var(--app-color-text-tertiary)]", INSET_SURFACE)}>
            No purchases to review right now. Finish the summary above if you're ready.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {scopedTransactions.map((transaction) => {
              const reviewed = hasReviewFeedback(transaction);
              return (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() => openFeedback(transaction)}
                  className="group rounded-[1.8rem] border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] p-5 text-left transition-all hover:border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_28%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_6%,transparent)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--app-accent-cyan-soft)]">
                          Purchase {String(transaction.id).slice(-3)}
                        </div>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em]",
                            reviewed ? SUCCESS_PILL : WARNING_PILL,
                          )}
                        >
                          {reviewed ? "Reviewed" : "Needs feedback"}
                        </span>
                      </div>
                      <div className="mt-2 truncate text-xl font-black text-[var(--app-color-text-primary)]">
                        {transaction.description_raw ||
                          formatCategoryLabel(transaction.category)}
                      </div>
                      <div className="mt-2 text-sm font-bold text-[var(--app-color-text-tertiary)]">
                        {reviewed ? "Feedback saved for this purchase." : "Still needs feedback for this review."}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-color-text-tertiary)]">
                        <span className="rounded-full border border-[var(--app-color-border-subtle)] px-3 py-1">
                          {new Date(transaction.occurred_at).toLocaleDateString()}
                        </span>
                        <span className="rounded-full border border-[var(--app-color-border-subtle)] px-3 py-1">
                          {formatCategoryLabel(transaction.category)}
                        </span>
                        <span className="rounded-full border border-[var(--app-color-border-subtle)] px-3 py-1">
                          {transaction.direction}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[var(--app-color-text-primary)]">
                        {currencyAmount(transaction.amount)}
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_12%,transparent)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-accent-cyan-soft)] transition-colors">
                        {reviewed ? "Edit feedback" : "Add feedback"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ElectricCard>

      {kind === "monthly" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SubscriptionNudgesCard
            title="Upcoming renewals"
            icon={<Calendar size={18} className="text-[var(--app-accent-yellow-soft)]" />}
            emptyText="No renewals are coming up in the next two weeks."
            subscriptions={overview.upcoming_subscription_renewals}
          />
          <SubscriptionNudgesCard
            title="Low-value subscriptions"
            icon={<Target size={18} className="text-[var(--app-color-status-danger)]" />}
            emptyText="No low-value subscription flags right now."
            subscriptions={overview.low_value_subscriptions}
          />
        </div>
      ) : null}

      <TransactionFeedbackModal
        transaction={selectedTransaction}
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        onSubmitted={() => {
          setFeedbackOpen(false);
          void loadReview();
        }}
      />
    </div>
  );
}

function HeroMetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-overlay)] p-5 backdrop-blur">
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--app-color-text-tertiary)]">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-[var(--app-color-text-primary)]">
        {value}
      </div>
      <div className="mt-2 text-xs font-bold leading-5 text-[var(--app-color-text-tertiary)]">
        {note}
      </div>
    </div>
  );
}

function ChecklistRow({
  done,
  title,
  description,
}: {
  done: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-base)] p-3">
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
          done
            ? SUCCESS_PILL
            : "border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] text-[var(--app-color-text-tertiary)]",
        )}
      >
        <CheckCircle2 size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-black text-[var(--app-color-text-primary)]">{title}</div>
        <div className="mt-1 text-xs font-bold leading-5 text-[var(--app-color-text-tertiary)]">
          {description}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-base)] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--app-color-text-tertiary)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-black leading-5 text-[var(--app-color-text-primary)]">{value}</div>
    </div>
  );
}

function SubscriptionNudgesCard({
  title,
  icon,
  subscriptions,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  subscriptions: ReviewSubscription[];
  emptyText: string;
}) {
  return (
    <ElectricCard semanticColor={COLORS.electricYellow} elevation={1}>
      <div className="mb-5 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-black text-[var(--app-color-text-primary)]">{title}</h2>
      </div>
      {subscriptions.length === 0 ? (
        <div className="rounded-[1.8rem] border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] p-6 text-sm font-bold text-[var(--app-color-text-tertiary)]">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="rounded-[1.8rem] border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black text-[var(--app-color-text-primary)]">{subscription.plan_name || "Subscription"}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--app-color-text-tertiary)]">
                    {subscription.billing_cycle} · {subscription.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[var(--app-color-text-primary)]">{currencyAmount(subscription.price)}</div>
                  {subscription.renewal_date ? (
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-color-text-faint)]">
                      Renews {new Date(subscription.renewal_date).toLocaleDateString()}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-color-text-tertiary)]">
                {subscription.subscription_utilization != null ? (
                  <span className="rounded-full border border-[var(--app-color-border-subtle)] px-3 py-1">
                    Utilization {Math.round(subscription.subscription_utilization * 100)}%
                  </span>
                ) : null}
                {subscription.subscription_cost_benefit != null ? (
                  <span className="rounded-full border border-[var(--app-color-border-subtle)] px-3 py-1">
                    Cost benefit {Math.round(subscription.subscription_cost_benefit * 100)}%
                  </span>
                ) : null}
                {subscription.feedback_value_score != null ? (
                  <span className="rounded-full border border-[var(--app-color-border-subtle)] px-3 py-1">
                    Value score {normalizeModelValueScore(subscription.feedback_value_score)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ElectricCard>
  );
}
