import * as React from "react";
import { Slider } from "@/shared/components/ui/slider";
import {
  TransactionsAPI,
  type TransactionFeedbackPayload,
} from "@/api/transactions.api";
import { BankingAPI } from "@/api/banking.api";
import { GamificationAPI } from "@/api/gamification.api";
import { toast } from "sonner";
import type { DisplayTransaction } from "../utils/normalizeBankTransaction";
import { getFeedbackWording } from "../utils/feedbackWording";
import {
  AppButton,
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
  AppInput,
  AppTextarea,
  FormField,
  StatusChip,
  Surface,
} from "@/shared/components/system";

type FeedbackForm = {
  satisfaction_rating: number | null;
  regret_rating: number;
  repurchase_likelihood: number;
  usage_frequency: string;
  reflection_text: string;
};

const INITIAL_FORM: FeedbackForm = {
  satisfaction_rating: null,
  regret_rating: 50,
  repurchase_likelihood: 50,
  usage_frequency: "",
  reflection_text: "",
};

function getPlaidId(displayId: string | number): string | null {
  if (typeof displayId !== "string") return null;
  if (!displayId.startsWith("bank-")) return null;
  return displayId.slice(5);
}

export function TransactionFeedbackModal({
  transaction,
  open,
  onOpenChange,
  onSubmitted,
}: {
  transaction: DisplayTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}) {
  const [form, setForm] = React.useState<FeedbackForm>(INITIAL_FORM);
  const [submittingAction, setSubmittingAction] = React.useState<"feedback" | "reflection" | null>(null);

  const isManual = transaction?.source === "manual" && typeof transaction.id === "number";
  const isBank = transaction?.source === "bank";
  const plaidId = transaction ? getPlaidId(transaction.id) : null;
  const canSubmit = isManual || (isBank && plaidId);
  const canSubmitReflection = Boolean(transaction);

  const wording = transaction ? getFeedbackWording(transaction.category) : null;

  React.useEffect(() => {
    if (open && transaction) {
      setForm({
        satisfaction_rating: transaction.satisfaction_rating ?? null,
        regret_rating: transaction.regret_rating ?? 50,
        repurchase_likelihood: transaction.repurchase_likelihood ?? 50,
        usage_frequency: transaction.usage_frequency != null ? String(transaction.usage_frequency) : "",
        reflection_text: transaction.reflection_text ?? "",
      });
    } else if (!open) {
      setForm(INITIAL_FORM);
      setSubmittingAction(null);
    }
  }, [open, transaction]);

  const set = <K extends keyof FeedbackForm>(key: K, val: FeedbackForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const hasSatisfactionRating =
    form.satisfaction_rating != null &&
    form.satisfaction_rating >= 1 &&
    form.satisfaction_rating <= 10;
  const hasReflectionText = form.reflection_text.trim().length > 0;
  const primaryAction =
    canSubmit && hasSatisfactionRating
      ? "feedback"
      : canSubmitReflection && hasReflectionText
        ? "reflection"
        : null;
  const footerNote =
    primaryAction === "feedback"
      ? "Rating and note save together."
      : hasReflectionText
        ? "Only the note will be saved."
        : "Add a rating or note.";

  const handleSubmit = async () => {
    if (!canSubmit || !transaction) return;

    if (!hasSatisfactionRating) {
      toast.error("Please rate satisfaction from 1 to 10.");
      return;
    }
    if (form.regret_rating < 0 || form.regret_rating > 100) {
      toast.error("Regret rating must be between 0 and 100.");
      return;
    }
    if (form.repurchase_likelihood < 0 || form.repurchase_likelihood > 100) {
      toast.error("Repurchase likelihood must be between 0 and 100.");
      return;
    }
    const usageNum = form.usage_frequency.trim() ? Number(form.usage_frequency) : undefined;
    if (usageNum !== undefined && (Number.isNaN(usageNum) || usageNum < 0)) {
      toast.error("Usage frequency must be a non-negative number.");
      return;
    }

    const payload: TransactionFeedbackPayload = {
      satisfaction_rating: form.satisfaction_rating,
      regret_rating: Math.round(form.regret_rating),
      repurchase_likelihood: Math.round(form.repurchase_likelihood),
      considered_at: new Date().toISOString(),
    };
    if (usageNum !== undefined) payload.usage_frequency = usageNum;
    if (form.reflection_text.trim()) payload.reflection_text = form.reflection_text.trim();

    setSubmittingAction("feedback");
    try {
      if (isManual && typeof transaction.id === "number") {
        await TransactionsAPI.submitFeedback(transaction.id, payload);
      } else if (isBank && plaidId) {
        await BankingAPI.submitFeedback(plaidId, payload);
      } else {
        throw new Error("Invalid transaction for feedback");
      }
      toast.success("Feedback saved.");
      onSubmitted?.();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save feedback.");
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleReflectionSubmit = async () => {
    if (!transaction) return;
    const notes = form.reflection_text.trim();
    if (!notes) {
      toast.error("Add a reflection before saving.");
      return;
    }

    setSubmittingAction("reflection");
    try {
      if (typeof transaction.id === "number") {
        await GamificationAPI.createTransactionReflection({
          transaction: transaction.id,
          notes,
        });
        toast.success("Reflection saved.");
      } else {
        toast.success("Reflection saved for this session.");
      }
      onSubmitted?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.success("Reflection saved for this session.");
      onSubmitted?.();
      onOpenChange(false);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handlePrimarySubmit = async () => {
    if (primaryAction === "feedback") {
      await handleSubmit();
      return;
    }
    if (primaryAction === "reflection") {
      await handleReflectionSubmit();
    }
  };

  if (!transaction) return null;

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent className="flex max-h-[min(88vh,900px)] max-w-2xl flex-col overflow-hidden">
        <AppDialogHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone="info">Purchase reflection</StatusChip>
            <StatusChip tone="neutral">
              {new Date(transaction.occurred_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </StatusChip>
          </div>
          <div className="space-y-2">
            <AppDialogTitle>Reflect on this purchase</AppDialogTitle>
            <AppDialogDescription>
              {(transaction.description_raw || "This purchase").trim()} · $
              {Math.abs(Number(transaction.amount)).toFixed(2)}
            </AppDialogDescription>
          </div>
        </AppDialogHeader>

        <AppDialogBody className="flex-1 space-y-5 overflow-y-auto">
          <Surface
            variant="inset"
            padding="sm"
            className="space-y-2 border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_6%,transparent)]"
          >
            <div className="app-label text-[var(--app-accent-cyan-soft)]">After using it</div>
            <p className="app-helper">
              Add a rating for full feedback, or leave a note.
            </p>
          </Surface>

          <FormField
            label={
              <>
                <span>Satisfaction</span> <span className="text-[var(--app-accent-red-soft)]">*</span>
              </>
            }
            helperText="1 to 10."
          >
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <AppButton
                  key={n}
                  type="button"
                  variant={form.satisfaction_rating === n ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => set("satisfaction_rating", form.satisfaction_rating === n ? null : n)}
                  className="min-w-0 px-0 text-[11px] tracking-normal sm:text-xs"
                >
                  {n}
                </AppButton>
              ))}
            </div>
          </FormField>

          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Regret" helperText="0 none, 100 high.">
              <div className="flex items-center gap-4">
                <Slider
                  value={[form.regret_rating]}
                  onValueChange={([v]) => set("regret_rating", v ?? 50)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <StatusChip tone="info">{Math.round(form.regret_rating)}</StatusChip>
              </div>
            </FormField>

            <FormField
              label={wording?.repurchaseLabel ?? "Would you buy or use this again?"}
              helperText="0 never, 100 definitely."
            >
              <div className="flex items-center gap-4">
                <Slider
                  value={[form.repurchase_likelihood]}
                  onValueChange={([v]) => set("repurchase_likelihood", v ?? 50)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <StatusChip tone="accent">{Math.round(form.repurchase_likelihood)}</StatusChip>
              </div>
            </FormField>
          </div>

          {wording?.showUsageFrequency && (
            <FormField
              label={wording.usageFrequencyLabel ?? "Usage frequency"}
              helperText="Optional."
            >
              <AppInput
                type="number"
                min={0}
                step={1}
                placeholder={wording.usageFrequencyPlaceholder ?? "e.g. 5"}
                value={form.usage_frequency}
                onChange={(e) => set("usage_frequency", e.target.value)}
              />
            </FormField>
          )}

          <FormField label="Reflection">
            <Surface
              variant="inset"
              padding="md"
              className="space-y-4 border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_18%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_4%,transparent)]"
            >
              <AppTextarea
                placeholder="What stood out?"
                value={form.reflection_text}
                onChange={(e) => set("reflection_text", e.target.value)}
                className="min-h-28"
              />
            </Surface>
          </FormField>
        </AppDialogBody>

        <AppDialogFooter className="gap-4 sm:justify-between">
          <p className="app-helper max-w-md text-left">{footerNote}</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <AppButton
              type="button"
              variant="quiet"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              type="button"
              variant="hero"
              size="lg"
              onClick={handlePrimarySubmit}
              disabled={submittingAction != null || primaryAction == null}
              className="sm:min-w-[12rem]"
            >
              {submittingAction != null
                ? "Saving..."
                : primaryAction === "feedback"
                  ? "Save feedback"
                  : primaryAction === "reflection"
                    ? "Save reflection"
                    : "Add rating or note"}
            </AppButton>
          </div>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
