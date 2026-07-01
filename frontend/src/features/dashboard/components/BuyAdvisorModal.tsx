import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, Camera, Sparkles, Zap } from "lucide-react";
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
  Surface,
} from "@/shared/components/system";
import { COLORS } from "@/shared/theme";

type BuyAdvisorModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const CATEGORY_OPTIONS = [
  { value: "lifestyle", label: "Lifestyle" },
  { value: "utility", label: "Utility" },
  { value: "experience", label: "Experience" },
] as const;

export function BuyAdvisorModal({ isOpen, onClose }: BuyAdvisorModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = React.useState<"input" | "loading" | "result">("input");
  const [predictedPrice, setPredictedPrice] = React.useState("");
  const [category, setCategory] = React.useState<string>(CATEGORY_OPTIONS[0].value);

  React.useEffect(() => {
    if (!isOpen) {
      setStep("input");
      return;
    }

    if (step !== "loading") return;

    const timeoutId = window.setTimeout(() => setStep("result"), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, step]);

  const handleAnalyze = () => {
    setStep("loading");
  };

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
                      Tell me what you are thinking about buying and I will compare it
                    against your recent behavior, satisfaction patterns, and likely
                    regret risk.
                  </AppDialogDescription>
                </div>
              </div>
            </AppDialogHeader>

            <AppDialogBody className="min-h-0 space-y-5 overflow-y-auto">
              <Surface
                variant="inset"
                padding="md"
                className="space-y-4 border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_6%,transparent)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="app-label text-[var(--app-accent-cyan-soft)]">Quick capture</div>
                    <p className="app-helper max-w-xl">
                      Start with an estimated price and category, or scan a product
                      when image intake is wired up.
                    </p>
                  </div>
                  <Sparkles className="size-5 text-[var(--app-accent-cyan-soft)]" aria-hidden="true" />
                </div>

                <AppButton
                  type="button"
                  variant="outline"
                  size="hero"
                  className="flex h-auto min-h-52 w-full flex-col items-center justify-center gap-3 rounded-[var(--app-radius-panel)] border-dashed bg-[var(--app-color-surface-base)]/55 px-6 py-8 text-center normal-case tracking-normal hover:border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_45%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_8%,transparent)]"
                >
                  <IconBadge tone="neutral" size="md">
                    <Camera />
                  </IconBadge>
                  <div className="space-y-1">
                    <div className="app-label">Scan product or receipt</div>
                    <p className="app-helper">
                      Placeholder entry point for the upcoming capture flow.
                    </p>
                  </div>
                </AppButton>
              </Surface>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Predicted price"
                  htmlFor="buy-advisor-price"
                  helperText="Rough estimates are enough."
                >
                  <AppInput
                    id="buy-advisor-price"
                    size="sm"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={predictedPrice}
                    onChange={(event) => setPredictedPrice(event.target.value)}
                    startAdornment={
                      <span className="text-sm font-black text-[var(--app-color-text-secondary)]">
                        $
                      </span>
                    }
                  />
                </FormField>

                <FormField
                  label="Target category"
                  helperText="Used to compare similar spend patterns."
                >
                  <AppSelect
                    value={category}
                    onValueChange={setCategory}
                    options={CATEGORY_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  />
                </FormField>
              </div>

              <Surface variant="card" padding="md" className="space-y-3">
                <div className="app-label">How this works</div>
                <p className="app-helper">
                  The advisor weighs recent purchase density, prior satisfaction,
                  and value-fit patterns before it recommends whether to wait.
                </p>
              </Surface>
            </AppDialogBody>

            <AppDialogFooter className="shrink-0 gap-3 sm:justify-between">
              <AppButton variant="quiet" onClick={onClose}>
                Cancel
              </AppButton>
              <AppButton variant="hero" size="hero" onClick={handleAnalyze}>
                Consult my CFO
              </AppButton>
            </AppDialogFooter>
          </>
        )}

        {step === "loading" && (
          <AppDialogBody className="flex min-h-[29rem] flex-col items-center justify-center gap-8 px-8 py-12 text-center">
            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.03, 1],
                      opacity: [0.9, 1, 0.9],
                    }
              }
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-5"
            >
                <IconBadge
                  tone="cyan"
                  size="lg"
                  className="size-24 rounded-full border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_10%,transparent)]"
                >
                <motion.div
                  animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="flex items-center justify-center"
                >
                  <Zap className="size-10" />
                </motion.div>
              </IconBadge>
              <div className="space-y-3">
                <StatusChip tone="info">Analyzing</StatusChip>
                <h3 className="app-section-title">Analyzing your financial memory</h3>
                <p className="app-helper max-w-md">
                  Checking similar purchases, recent velocity, and the odds that a
                  24-hour delay improves satisfaction.
                </p>
              </div>
            </motion.div>
          </AppDialogBody>
        )}

        {step === "result" && (
          <>
            <AppDialogHeader className="gap-4 px-8 pt-8 pr-20 text-center sm:text-center">
              <StatusChip tone="warning" className="mx-auto">
                Value fit flagged
              </StatusChip>
              <div className="space-y-3">
                <div
                  className="text-7xl font-black tracking-tight sm:text-8xl"
                    style={{ color: "var(--app-accent-red-soft)" }}
                >
                  72
                </div>
                <AppDialogTitle className="text-center">Personalized Value Fit</AppDialogTitle>
                <AppDialogDescription className="mx-auto max-w-xl text-center">
                  This purchase is not a hard no. It is a moderate-risk yes that
                  looks stronger if you slow the decision down.
                </AppDialogDescription>
              </div>
            </AppDialogHeader>

            <AppDialogBody className="space-y-6">
              <Surface
                variant="inset"
                padding="lg"
                className="space-y-4 border-[color:color-mix(in_srgb,var(--app-accent-red-soft)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-red-soft)_8%,transparent)]"
              >
                <div className="flex items-center gap-3">
                  <IconBadge tone="red" size="sm">
                    <AlertCircle />
                  </IconBadge>
                  <div>
                    <div className="app-label text-[var(--app-accent-red-soft)]">Recommendation</div>
                    <h3 className="app-card-title text-[var(--app-color-text-primary)]">
                      Delay recommended
                    </h3>
                  </div>
                </div>
                <p className="app-helper">
                  Your recent history shows three comparable purchases this month,
                  and similar decisions trended toward regret after the initial
                  excitement wore off. Waiting 24 hours is likely to improve the
                  outcome.
                </p>
              </Surface>

              <div className="grid gap-3 md:grid-cols-3">
                <AppButton variant="quiet" size="lg" onClick={onClose}>
                  Skip
                </AppButton>
                <AppButton
                  variant="danger"
                  size="lg"
                >
                  Delay 24h
                </AppButton>
                <AppButton size="lg">Buy now</AppButton>
              </div>
            </AppDialogBody>
          </>
        )}
      </AppDialogContent>
    </AppDialog>
  );
}
