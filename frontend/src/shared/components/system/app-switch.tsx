import * as React from "react";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/components/ui/utils";

type AppSwitchProps = React.ComponentProps<typeof Switch> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
  containerClassName?: string;
};

function AppSwitch({
  className,
  label,
  description,
  containerClassName,
  ...props
}: AppSwitchProps) {
  const control = (
    <Switch
      className={cn(
        "h-7 w-14 border-[var(--app-color-border-strong)] data-[state=checked]:bg-[var(--app-accent-cyan)] data-[state=unchecked]:bg-[var(--app-color-surface-raised)]",
        "[&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb]]:bg-[var(--app-color-text-inverse)] data-[state=checked]:[&_[data-slot=switch-thumb]]:bg-[var(--app-color-text-inverse)] data-[state=unchecked]:[&_[data-slot=switch-thumb]]:bg-[var(--app-color-text-primary)]",
        className
      )}
      {...props}
    />
  );

  if (!label && !description) return control;

  return (
    <label className={cn("flex items-center justify-between gap-4", containerClassName)}>
      <span className="space-y-1 text-left">
        {label ? <span className="block font-black text-[var(--app-color-text-primary)]">{label}</span> : null}
        {description ? <span className="block text-sm text-[var(--app-color-text-tertiary)]">{description}</span> : null}
      </span>
      {control}
    </label>
  );
}

export { AppSwitch };
