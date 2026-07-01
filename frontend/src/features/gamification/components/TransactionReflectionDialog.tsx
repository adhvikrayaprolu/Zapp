import * as React from "react";
import { MessageSquare, Sparkles } from "lucide-react";

import type { Transaction } from "@/api/transactions.api";
import { GamificationAPI } from "@/api/gamification.api";
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
  Surface,
} from "@/shared/components/system";
import { cn } from "@/shared/components/ui/utils";
import { toast } from "sonner";

type TransactionReflectionDialogProps = {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
};

export function TransactionReflectionDialog({
  transaction,
  open,
  onOpenChange,
  onSubmitted,
}: TransactionReflectionDialogProps) {
  const [regretScore, setRegretScore] = React.useState("");
  const [wasWorthIt, setWasWorthIt] = React.useState<boolean | null>(null);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setRegretScore("");
      setWasWorthIt(null);
      setNotes("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transaction) return;

    const parsedScore = regretScore.trim() ? Number(regretScore) : null;
    if (parsedScore != null && (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
      toast.error("Regret score must be between 0 and 100.");
      return;
    }

    try {
      setSubmitting(true);
      await GamificationAPI.createTransactionReflection({
        transaction: transaction.id,
        regret_score: parsedScore,
        was_worth_it: wasWorthIt,
        notes: notes.trim(),
      });
      toast.success("Reflection saved.");
      onOpenChange(false);
      onSubmitted?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save reflection. You may have already reflected on this purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent className="max-w-xl">
          <AppDialogHeader>
            <AppDialogTitle className="flex items-center gap-2 text-2xl font-black">
             <MessageSquare size={20} className="text-[var(--app-accent-cyan-soft)]" />
             Reflect On This Purchase
            </AppDialogTitle>
          <AppDialogDescription>
            Capture whether this spend felt worth it while the context is still fresh.
          </AppDialogDescription>
        </AppDialogHeader>

        {transaction && (
          <Surface variant="panel" padding="md" className="mx-8 rounded-[1.5rem]">
            <div className="text-lg font-black text-[var(--app-color-text-primary)]">
              {transaction.description_raw || transaction.category}
            </div>
            <div className="app-eyebrow mt-2">
              ${Number(transaction.amount).toFixed(2)} • {new Date(transaction.occurred_at).toLocaleString()}
            </div>
          </Surface>
        )}

        <AppDialogBody>
          <form className="space-y-5" onSubmit={handleSubmit}>
          <FormField label="Regret Score">
            <AppInput
              type="number"
              min="0"
              max="100"
              placeholder="0 to 100"
              value={regretScore}
              onChange={(event) => setRegretScore(event.target.value)}
            />
          </FormField>

          <FormField label="Was It Worth It?">
            <div className="grid grid-cols-2 gap-3">
              {[ 
                { label: "Worth It", value: true },
                { label: "Not Worth It", value: false },
              ].map((option) => (
                <AppButton
                  key={option.label}
                  type="button"
                  onClick={() => setWasWorthIt(option.value)}
                    variant={wasWorthIt === option.value ? "quietAccent" : "outline"}
                    className={cn(
                      "rounded-2xl text-sm font-black transition-all",
                      wasWorthIt === option.value
                      ? "border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_10%,transparent)]"
                      : "app-input text-[var(--app-color-text-secondary)] hover:border-[var(--app-color-border-focus)] hover:text-[var(--app-color-text-primary)]",
                    )}
                  >
                  {option.label}
                </AppButton>
              ))}
            </div>
          </FormField>

          <FormField label="Notes">
            <AppTextarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What drove the purchase, and how do you feel about it now?"
            />
          </FormField>

          <Surface
            variant="inset"
            padding="sm"
            className="rounded-[1.5rem] text-sm text-[var(--app-color-text-secondary)]"
            style={{
              borderColor: "color-mix(in srgb, var(--app-accent-cyan-soft) 20%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--app-accent-cyan-soft) 8%, transparent)",
            }}
          >
            <div className="mb-1 flex items-center gap-2 font-black text-[var(--app-accent-cyan-soft)]">
              <Sparkles size={14} />
              Same-day reflection helps your streak and badges.
            </div>
            <p className="text-xs leading-relaxed text-[var(--app-color-text-secondary)]">
              Reflections are meant for purchases. Income entries won’t count toward gamification.
            </p>
          </Surface>

          <AppDialogFooter className="px-0 pb-0">
            <AppButton
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Reflection"}
            </AppButton>
          </AppDialogFooter>
        </form>
        </AppDialogBody>
      </AppDialogContent>
    </AppDialog>
  );
}
