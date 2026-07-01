import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Slider } from "@/shared/components/ui/slider";
import {
  AppButton,
  AppInput,
  FormField,
  StatusChip,
  Surface,
} from "@/shared/components/system";
import { OnboardingAPI, type OnboardingData } from "@/api/onboarding.api";
import { toast } from "sonner";
import { AppLogo } from "@/shared/components/brand/AppLogo";
import { useAuth } from "@/features/auth";

const TOTAL_STEPS = 5;

const LIFE_STAGE_OPTIONS = [
  { label: "Student", value: "student" },
  { label: "Early Career", value: "early_career" },
  { label: "Mid Career", value: "mid_career" },
  { label: "Late Career", value: "late_career" },
  { label: "Parent", value: "parent" },
  { label: "Retired", value: "retired" },
] as const;

const INCOME_OPTIONS = ["< $2k", "$2k-4k", "$4k-7k", "$7k-10k", "$10k+"] as const;

const GOAL_OPTIONS = [
  { label: "Save more", value: "save_more" },
  { label: "Invest", value: "invest" },
  { label: "Reduce debt", value: "reduce_debt" },
  { label: "Build credit", value: "build_credit" },
  { label: "Control subscriptions", value: "control_subs" },
] as const;

const RISK_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
] as const;

const BUDGET_OPTIONS = [
  { label: "Strict", value: "strict" },
  { label: "Flexible", value: "flexible" },
  { label: "Optimize value", value: "optimize_value" },
] as const;

const defaultData: OnboardingData = {
  life_stage: "",
  household_size: null,
  location_zip: "",
  income_range: "",
  monthly_fixed_expenses: null,
  financial_goal: "",
  risk_tolerance: "",
  budget_style: "",
  value_priority_cost: 50,
  value_priority_quality: 50,
  value_priority_sustainability: 50,
  self_report_research_habit: null,
};

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <AppButton
      type="button"
      variant={selected ? "primary" : "secondary"}
      size="lg"
      onClick={onClick}
      className="w-full justify-start rounded-[var(--app-radius-control)] px-5 text-left text-sm normal-case tracking-normal"
    >
      {label}
    </AppButton>
  );
}

function SliderInput({
  label,
  question,
  value,
  onChange,
}: {
  label: string;
  question: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Surface variant="inset" padding="md" className="space-y-4">
      <div className="space-y-2">
        <div className="app-label">{label}</div>
        <p className="text-sm font-semibold text-[var(--app-color-text-primary)]">
          {question}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          value={[value]}
          onValueChange={([next]) => onChange(next ?? value)}
          min={0}
          max={100}
          step={1}
          className="flex-1 [&_[data-slot=slider-range]]:bg-[var(--app-accent-cyan-soft)] [&_[data-slot=slider-thumb]]:border-[var(--app-accent-cyan-soft)] [&_[data-slot=slider-thumb]]:bg-[var(--app-color-surface-base)] [&_[data-slot=slider-track]]:bg-[var(--app-color-border-subtle)]"
        />
        <StatusChip tone="info" className="min-w-12 justify-center">
          {value}
        </StatusChip>
      </div>
    </Surface>
  );
}

function StepSection({
  section,
  title,
  description,
  children,
}: {
  section?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {section ? <StatusChip tone="info">{section}</StatusChip> : null}
        <div className="space-y-2">
          <h2 className="app-section-title">{title}</h2>
          {description ? <p className="app-helper">{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { isAuthReady, isAuthenticated, nextStep, nextRoute, refreshSession } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [data, setData] = React.useState<OnboardingData>(defaultData);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (nextStep && nextStep !== "onboarding_survey") {
      navigate(nextRoute, { replace: true });
    }
  }, [isAuthReady, isAuthenticated, navigate, nextRoute, nextStep]);

  const set = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const goNext = () => {
    setDirection(1);
    setStep((current) => current + 1);
  };

  const goPrev = () => {
    setDirection(-1);
    setStep((current) => current - 1);
  };

  const handleSkip = () => navigate("/", { replace: true });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await OnboardingAPI.submit(data);
      const session = await refreshSession();
      toast.success("You're all set! Welcome to Zapp.");
      navigate(session.nextRoute, { replace: true });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    <div className="space-y-6 py-4 text-center" key="welcome">
      <div className="mx-auto flex justify-center">
        <AppLogo size={92} />
      </div>
      <div className="space-y-3">
        <h2 className="app-section-title">Let's set you up</h2>
        <p className="app-helper mx-auto max-w-md">
          Answer a few quick questions so Zapp can personalize your value scores
          and spending insights.
        </p>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="size-4 text-[var(--app-accent-cyan-soft)]" aria-hidden="true" />
        <span className="app-label text-[var(--app-accent-cyan-soft)]">Takes about 2 minutes</span>
      </div>
    </div>,

    <StepSection
      key="about"
      section="Section 1 of 4"
      title="About you"
      description="A little context helps tailor category scoring and household-aware suggestions."
    >
      <FormField label="Life stage">
        <div className="grid gap-3 sm:grid-cols-2">
          {LIFE_STAGE_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={data.life_stage === option.value}
              onClick={() => set("life_stage", option.value)}
            />
          ))}
        </div>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Household size">
          <AppInput
            type="number"
            min={1}
            placeholder="e.g. 2"
            value={data.household_size ?? ""}
            onChange={(event) =>
              set(
                "household_size",
                event.target.value ? Number(event.target.value) : null
              )
            }
          />
        </FormField>

        <FormField label="Zip code">
          <AppInput
            type="text"
            placeholder="e.g. 90210"
            value={data.location_zip}
            onChange={(event) => set("location_zip", event.target.value)}
          />
        </FormField>
      </div>
    </StepSection>,

    <StepSection
      key="finances"
      section="Section 2 of 4"
      title="Your finances"
      description="These answers anchor recommendations to your actual spending capacity."
    >
      <FormField label="Monthly income">
        <div className="grid gap-3 sm:grid-cols-2">
          {INCOME_OPTIONS.map((option) => (
            <OptionButton
              key={option}
              label={option}
              selected={data.income_range === option}
              onClick={() => set("income_range", option)}
            />
          ))}
        </div>
      </FormField>

      <FormField
        label="Monthly fixed expenses"
        helperText="Optional."
      >
        <AppInput
          type="number"
          placeholder="e.g. 1500"
          value={data.monthly_fixed_expenses ?? ""}
          onChange={(event) =>
            set(
              "monthly_fixed_expenses",
              event.target.value ? Number(event.target.value) : null
            )
          }
        />
      </FormField>
    </StepSection>,

    <StepSection
      key="goals"
      section="Section 3 of 4"
      title="Your goals"
      description="These preference signals help Zapp prioritize advice, risk, and planning style."
    >
      <FormField label="Primary financial goal">
        <div className="grid gap-3">
          {GOAL_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={data.financial_goal === option.value}
              onClick={() => set("financial_goal", option.value)}
            />
          ))}
        </div>
      </FormField>

      <FormField label="Risk tolerance">
        <div className="grid gap-3 sm:grid-cols-3">
          {RISK_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={data.risk_tolerance === option.value}
              onClick={() => set("risk_tolerance", option.value)}
            />
          ))}
        </div>
      </FormField>

      <FormField label="Budget style">
        <div className="grid gap-3 sm:grid-cols-3">
          {BUDGET_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={data.budget_style === option.value}
              onClick={() => set("budget_style", option.value)}
            />
          ))}
        </div>
      </FormField>
    </StepSection>,

    <StepSection
      key="values"
      section="Section 4 of 4"
      title="What matters to you?"
      description="These sliders power the value-fit system behind your purchase guidance."
    >
      <div className="space-y-4">
        <SliderInput
          label="Cost sensitivity"
          question="How important is getting the lowest price?"
          value={data.value_priority_cost}
          onChange={(value) => set("value_priority_cost", value)}
        />
        <SliderInput
          label="Quality importance"
          question="How important is product quality to you?"
          value={data.value_priority_quality}
          onChange={(value) => set("value_priority_quality", value)}
        />
        <SliderInput
          label="Sustainability"
          question="How important is sustainability or ethics in purchases?"
          value={data.value_priority_sustainability}
          onChange={(value) => set("value_priority_sustainability", value)}
        />
        <SliderInput
          label="Research habit"
          question="How much do you research before buying something?"
          value={data.self_report_research_habit ?? 50}
          onChange={(value) => set("self_report_research_habit", value)}
        />
      </div>
    </StepSection>,
  ];

  return (
    <div className="min-h-screen px-6 py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <StatusChip tone="info">
              {step === 0 ? "Welcome" : `Step ${step} of ${TOTAL_STEPS - 1}`}
            </StatusChip>
            <p className="app-helper">
              Set a baseline once. You can refine these preferences later.
            </p>
          </div>
          <AppButton type="button" variant="quiet" size="sm" onClick={handleSkip}>
            Skip for now
          </AppButton>
        </div>

        <Surface variant="card" padding="sm" className="overflow-hidden">
          <div className="h-2 rounded-full bg-[var(--app-color-border-subtle)]">
            <motion.div
              className="h-full rounded-full bg-[var(--app-accent-cyan-soft)]"
              animate={
                shouldReduceMotion
                  ? undefined
                  : { width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }
              }
              style={
                shouldReduceMotion
                  ? { width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }
                  : undefined
              }
              transition={{ duration: 0.3 }}
            />
          </div>
        </Surface>

        <Surface variant="overlay" padding="xl" className="overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={shouldReduceMotion ? false : { opacity: 0, x: direction * 28 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </Surface>

        <div className="flex items-center justify-between gap-4">
          <AppButton
            type="button"
            variant="quiet"
            size="lg"
            onClick={goPrev}
            disabled={step === 0}
          >
            <ChevronLeft />
            Back
          </AppButton>

          {step < TOTAL_STEPS - 1 ? (
            <AppButton type="button" variant="hero" size="lg" onClick={goNext}>
              {step === 0 ? "Get started" : "Continue"}
              <ChevronRight />
            </AppButton>
          ) : (
            <AppButton
              type="button"
              variant="hero"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Finish setup"}
              <ChevronRight />
            </AppButton>
          )}
        </div>
      </div>
    </div>
  );
}

