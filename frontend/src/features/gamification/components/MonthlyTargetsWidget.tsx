import * as React from "react";
import { motion } from "motion/react";
import { CheckCircle2, Clock3, Plus, Target } from "lucide-react";

import { GamificationAPI, type MonthlyTarget } from "@/api/gamification.api";
import { ElectricCard } from "@/features/home/components/ElectricCard";
import { COLORS, UI_PATTERNS } from "@/shared/theme";
import { cn } from "@/shared/components/ui/utils";
import { toast } from "sonner";
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
  EmptyState,
  FormField,
  IconBadge,
  LoadingState,
  StatusChip,
  Surface,
} from "@/shared/components/system";

type MonthlyTargetsWidgetProps = {
  compact?: boolean;
};

const TARGET_TYPES = [
  { value: "transactions_logged", label: "Transactions" },
  { value: "reflections_completed", label: "Reflections" },
  { value: "item_valuations", label: "Advisor Uses" },
  { value: "custom", label: "Custom" },
];

export function MonthlyTargetsWidget({ compact = false }: MonthlyTargetsWidgetProps) {
  const [targets, setTargets] = React.useState<MonthlyTarget[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const loadTargets = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await GamificationAPI.getMonthlyTargets();
      setTargets(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load monthly targets.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  const targetList = compact ? targets.slice(0, 3) : targets;

  return (
    <>
      <ElectricCard
        className={compact ? "p-6" : "p-8"}
        semanticColor={COLORS.electricPurple}
        elevation={compact ? 1 : 2}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBadge tone="purple" size="sm">
              <Target size={18} />
            </IconBadge>
            <h3 className={compact ? "app-card-title text-lg" : "app-section-title text-[1.75rem]"}>
              Monthly Targets
            </h3>
          </div>
          <AppButton
            onClick={() => setIsCreateOpen(true)}
            variant="accent"
            size="sm"
          >
            <Plus size={14} />
            New
          </AppButton>
        </div>

        {loading && <LoadingState label="Loading targets" lines={compact ? 2 : 3} compact={compact} />}

        {!loading && targetList.length === 0 && (
          <EmptyState
            icon={<Target size={28} />}
            title="No monthly targets yet."
            description="Set a goal tied to the habit you want to reinforce this month."
          />
        )}

        {!loading && targetList.length > 0 && (
          <div className="space-y-4">
            {targetList.map((target) => (
              <MonthlyTargetCard key={target.id} target={target} compact={compact} onUpdated={loadTargets} />
            ))}
          </div>
        )}
      </ElectricCard>

      <CreateTargetDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={loadTargets}
      />
    </>
  );
}

function MonthlyTargetCard({
  target,
  compact,
  onUpdated,
}: {
  target: MonthlyTarget;
  compact: boolean;
  onUpdated: () => Promise<void>;
}) {
  const [amount, setAmount] = React.useState("1");
  const [submittingProgress, setSubmittingProgress] = React.useState(false);
  const completed = target.status === "completed";
  const progress = Math.min(100, (target.current_value / Math.max(target.target_value, 1)) * 100);

  const handleProgress = async () => {
    if (submittingProgress) {
      return;
    }

    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a positive progress amount.");
      return;
    }
    try {
      setSubmittingProgress(true);
      await GamificationAPI.updateTargetProgress(target.id, parsed);
      toast.success("Target progress updated.");
      await onUpdated();
      setAmount("1");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update target progress.");
    } finally {
      setSubmittingProgress(false);
    }
  };

  return (
    <Surface variant="panel" padding="md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            {completed ? (
              <CheckCircle2 size={16} className="text-green-400" />
            ) : (
              <Clock3 size={16} className="text-purple-400" />
            )}
            <h4 className="app-card-title">{target.title}</h4>
          </div>
          <div className={UI_PATTERNS.eyebrow}>
            {target.target_type.replaceAll("_", " ")}
          </div>
        </div>
        <StatusChip tone={completed ? "success" : "accent"}>
          {completed ? "Completed" : "Active"}
        </StatusChip>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm font-bold text-[var(--app-color-text-secondary)]">
        <span>{target.current_value} / {target.target_value}</span>
        <span className="text-[var(--app-color-text-primary)]">{Math.round(progress)}%</span>
      </div>
      <div className="mb-5 h-2 rounded-full bg-[var(--app-color-surface-inset)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ backgroundColor: completed ? "var(--app-accent-green)" : "var(--app-accent-purple)" }}
        />
      </div>

      {!completed && !compact && (
        <div className="flex items-center gap-3">
          <AppInput
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min="1"
            disabled={submittingProgress}
            size="sm"
          />
          <AppButton
            onClick={handleProgress}
            disabled={submittingProgress}
            variant="accent"
          >
            {submittingProgress ? "Updating..." : "Log progress"}
          </AppButton>
        </div>
      )}
    </Surface>
  );
}

function CreateTargetDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [targetType, setTargetType] = React.useState(TARGET_TYPES[0].value);
  const [targetValue, setTargetValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedValue = Number(targetValue);
    if (!title.trim() || !parsedValue || parsedValue <= 0) {
      toast.error("Fill out a valid target.");
      return;
    }

    try {
      setSubmitting(true);
      const monthStart = new Date();
      const monthStartString = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;
      await GamificationAPI.createMonthlyTarget({
        target_type: targetType,
        title: title.trim(),
        target_value: parsedValue,
        month_start: monthStartString,
      });
      toast.success("Monthly target created.");
      onOpenChange(false);
      setTitle("");
      setTargetValue("");
      setTargetType(TARGET_TYPES[0].value);
      await onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create target.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogContent className="max-w-2xl">
        <AppDialogHeader>
          <AppDialogTitle>Create Monthly Target</AppDialogTitle>
          <AppDialogDescription>
            Set a goal tied to the habits you want to reinforce this month.
          </AppDialogDescription>
        </AppDialogHeader>

        <AppDialogBody>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <FormField label="Target Type">
              <div className="grid grid-cols-2 gap-2">
                {TARGET_TYPES.map((type) => (
                  <AppButton
                    key={type.value}
                    type="button"
                    variant={targetType === type.value ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setTargetType(type.value)}
                    className={cn(targetType !== type.value && "text-[var(--app-color-text-secondary)]")}
                  >
                    {type.label}
                  </AppButton>
                ))}
              </div>
            </FormField>

            <FormField label="Title">
              <AppInput
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Reflect on 8 purchases"
              />
            </FormField>

            <FormField label="Target Value">
              <AppInput
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                type="number"
                min="1"
              />
            </FormField>

            <AppDialogFooter className="px-0 pb-0">
              <AppButton
                type="submit"
                disabled={submitting}
                variant="accent"
              >
                {submitting ? "Creating..." : "Create Target"}
              </AppButton>
            </AppDialogFooter>
          </form>
        </AppDialogBody>
      </AppDialogContent>
    </AppDialog>
  );
}
