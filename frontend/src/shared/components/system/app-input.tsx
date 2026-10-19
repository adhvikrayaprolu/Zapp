import * as React from "react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/components/ui/utils";

const sizeClasses = {
  sm: "h-10 rounded-[var(--app-radius-md)] px-3 text-sm",
  md: "h-12 rounded-[var(--app-radius-control)] px-4 text-sm",
  lg: "h-14 rounded-[var(--app-radius-control)] px-5 text-base",
  hero: "h-20 rounded-[var(--app-radius-panel)] px-6 text-xl font-black md:text-3xl",
} as const;

// Omit the native numeric `size` attribute; ours selects a size variant.
type AppInputProps = Omit<React.ComponentProps<typeof Input>, "size"> & {
  size?: keyof typeof sizeClasses;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  containerClassName?: string;
};

function AppInput({
  className,
  size = "md",
  startAdornment,
  endAdornment,
  containerClassName,
  ...props
}: AppInputProps) {
  const hasAdornment = startAdornment || endAdornment;

  const field = (
    <Input
      className={cn(
        "w-full border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-inset)] text-[var(--app-color-text-primary)] shadow-none placeholder:text-[var(--app-color-text-tertiary)] focus-visible:border-ring",
        sizeClasses[size],
        startAdornment && (size === "hero" ? "pl-20" : "pl-12"),
        endAdornment && (size === "hero" ? "pr-40" : "pr-12"),
        className
      )}
      {...props}
    />
  );

  if (!hasAdornment) return field;

  return (
    <div className={cn("relative", containerClassName)}>
      {startAdornment && (
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex items-center text-[var(--app-color-text-tertiary)]",
            size === "hero" ? "pl-6" : "pl-4"
          )}
        >
          {startAdornment}
        </span>
      )}
      {field}
      {endAdornment && <span className="absolute inset-y-0 right-0 flex items-center pr-3">{endAdornment}</span>}
    </div>
  );
}

export { AppInput };
