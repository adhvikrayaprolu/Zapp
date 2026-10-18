import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";
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
  AppSelect,
  FormField,
  IconBadge,
  StatusChip,
  Surface,
} from "@/shared/components/system";
import { ApiError } from "@/api/client";
import {
  PURCHASE_CATEGORY_OPTIONS,
  PurchaseCheckAPI,
  type PurchaseCategory,
  type PurchaseCheckResult,
  type PurchaseCheckVerdict,
} from "@/api/valuations.api";
import { getValuePresentation } from "@/shared/valuation";

type BuyAdvisorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Prefills the item name (e.g. from the Decision Engine search box). */
  initialItem?: string;
};

const VERDICT_STYLE: Record<
  PurchaseCheckVerdict,
  { tone: "success" | "warning" | "danger"; icon: typeof CheckCircle2; iconTone: "green" | "yellow" | "red" }
> = {
  buy: { tone: "success", icon: CheckCircle2, iconTone: "green" },
  wait: { tone: "warning", icon: Clock, iconTone: "yellow" },
  skip: { tone: "danger", icon: AlertCircle, iconTone: "red" },
};

function parsePrice(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function BuyAdvisorModal({ isOpen, onClose, initialItem = "" }: BuyAdvisorModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = React.useState<"input" | "loading" | "result">("input");
  const [item, setItem] = React.useState(initialItem);
  const [price, setPrice] = React.useState("");
  const [category, setCategory] = React.useState<PurchaseCategory>(PURCHASE_CATEGORY_OPTIONS[0].value);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PurchaseCheckResult | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setItem(initialItem);
    } else {
      setStep("input");
      setPrice("");
      setError(null);
      setResult(null);
    }
  }, [isOpen, initialItem]);

  const parsedPrice = parsePrice(price);

  const handleAnalyze = async () => {
    if (parsedPrice == null) {
      setError("Enter a price greater than $0.");
      return;
    }
    setError(null);
    setStep("loading");
    try {
      const response = await PurchaseCheckAPI.check({
        item: item.trim(),
        amount: parsedPrice.toFixed(2),
        category,
      });
      setResult(response);
      setStep("result");
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Couldn't check this purchase.");
      setStep("input");
    }
  };

  const verdictStyle = result ? VERDICT_STYLE[result.verdict] : null;
  const scoreColor = result ? getValuePresentation(result.score).accentColor : undefined;
  const categoryLabel =
    PURCHASE_CATEGORY_OPTIONS.find((option) => option.value === result?.category)?.label.toLowerCase() ?? "";

  return (
    <AppDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AppDialogContent className="flex max-h-[min(92vh,920px)] max-w-2xl flex-col overflow-hidden border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_18%,transparent)] p-0 [&>[data-slot=dialog-close]]:top-5 [&>[data-slot=dialog-close]]:right-5 [&>[data-slot=dialog-close]]:rounded-[var(--app-radius-md)] [&>[data-slot=dialog-close]]:border [&>[data-slot=dialog-close]]:border-[var(--app-color-border-strong)] [&>[data-slot=dialog-close]]:bg-[var(--app-color-surface-inset)] [&>[data-slot=dialog-close]]:p-2 [&>[data-slot=dialog-close]]:text-[var(--app-color-text-secondary)] [&>[data-slot=dialog-close]]:opacity-100 sm:[&>[data-slot=dialog-close]]:top-6 sm:[&>[data-slot=dialog-close]]:right-6">
        {step === "input" && (
          <>
            <AppDialogHeader className="gap-4 px-6 pt-6 pr-18 sm:px-8 sm:pt-8 sm:pr-20">
              <div className="flex items-start gap-4">
                <IconBadge tone="cyan" size="lg">
                  <Zap className="size-5 sm:size-6" />
                </IconBadge>
                <div className="min-w-0 space-y-3 pr-2">
                  <AppDialogTitle>Buy Advisor</AppDialogTitle>
                  <AppDialogDescription>
                    Tell me what you're thinking about buying and I'll compare it against
                    your own history in that category: how you rated similar purchases,
                    your usual monthly spend, and your typical price.
                  </AppDialogDescription>
                </div>
              </div>
            </AppDialogHeader>

            <AppDialogBody className="min-h-0 space-y-5 overflow-y-auto">
              <form
                id="buy-advisor-form"
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAnalyze();
                }}
              >
                <FormField label="What is it?" htmlFor="buy-advisor-item" helperText="Optional, e.g. wireless headphones.">
                  <AppInput
                    id="buy-advisor-item"
                    size="sm"
                    maxLength={120}
                    placeholder="Item or service"
                    value={item}
                    onChange={(event) => setItem(event.target.value)}
                  />
                </FormField>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Price" htmlFor="buy-advisor-price" helperText="A rough estimate is enough.">
                    <AppInput
                      id="buy-advisor-price"
                      size="sm"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      aria-invalid={error != null && parsedPrice == null}
                      startAdornment={
                        <span className="text-sm font-black text-[var(--app-color-text-secondary)]">$</span>
                      }
                    />
                  </FormField>

                  <FormField label="Category" helperText="Compared with your past purchases here.">
                    <AppSelect
                      value={category}
                      onValueChange={(value) => setCategory(value as PurchaseCategory)}
                      options={PURCHASE_CATEGORY_OPTIONS}
                    />
                  </FormField>
                </div>
              </form>

              {error && (
                <p role="alert" className="text-sm font-semibold text-[var(--app-accent-red-soft)]">
                  {error}
                </p>
              )}

              <Surface variant="card" padding="md" className="space-y-3">
                <div className="app-label">How this works</div>
                <p className="app-helper">
                  A transparent check on your last 180 days of transactions, not a
                  prediction from an AI model. Every factor that moves the score is
                  listed with the numbers behind it.
                </p>
              </Surface>
            </AppDialogBody>

            <AppDialogFooter className="shrink-0 gap-3 sm:justify-between">
              <AppButton variant="quiet" onClick={onClose}>
                Cancel
              </AppButton>
              <AppButton variant="hero" size="hero" type="submit" form="buy-advisor-form">
                Consult my CFO
              </AppButton>
            </AppDialogFooter>
          </>
        )}

        {step === "loading" && (
          <AppDialogBody className="flex min-h-[29rem] flex-col items-center justify-center gap-8 px-8 py-12 text-center">
            <motion.div
              animate={shouldReduceMotion ? undefined : { scale: [1, 1.03, 1], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-5"
            >
              <IconBadge
                tone="cyan"
                size="lg"
                className="size-24 rounded-full border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_10%,transparent)]"
              >
                <Zap className="size-10" />
              </IconBadge>
              <div className="space-y-3">
                <StatusChip tone="info">Checking</StatusChip>
                <h3 className="app-section-title">Comparing with your history</h3>
              </div>
            </motion.div>
          </AppDialogBody>
        )}

        {step === "result" && result && verdictStyle && (
          <>
            <AppDialogHeader className="gap-4 px-8 pt-8 pr-20 text-center sm:text-center">
              <StatusChip tone={verdictStyle.tone} className="mx-auto">
                {result.verdict_label}
              </StatusChip>
              <div className="space-y-3">
                <div className="text-7xl font-black tracking-tight sm:text-8xl" style={{ color: scoreColor }}>
                  {result.score}
                </div>
                <AppDialogTitle className="text-center">
                  {result.item ? `Value fit for ${result.item}` : "Value fit"}
                </AppDialogTitle>
                <AppDialogDescription className="mx-auto max-w-xl text-center">
                  ${result.amount} in {categoryLabel}, on the same 0-150 scale as your value scores
                  (about 100 means a good match).
                </AppDialogDescription>
              </div>
            </AppDialogHeader>

            <AppDialogBody className="space-y-6">
              <Surface variant="inset" padding="lg" className="space-y-4">
                <div className="flex items-center gap-3">
                  <IconBadge tone={verdictStyle.iconTone} size="sm">
                    <verdictStyle.icon />
                  </IconBadge>
                  <div className="app-label">Why</div>
                </div>
                <ul className="space-y-2">
                  {result.reasons.map((reason) => (
                    <li key={reason} className="app-helper flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </Surface>

              <p className="app-helper text-center text-xs">
                Based only on your own transactions. General guidance, not financial advice.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <AppButton variant="quiet" size="lg" onClick={() => setStep("input")}>
                  Check another
                </AppButton>
                <AppButton size="lg" onClick={onClose}>
                  Done
                </AppButton>
              </div>
            </AppDialogBody>
          </>
        )}
      </AppDialogContent>
    </AppDialog>
  );
}
