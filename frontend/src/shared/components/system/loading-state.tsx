import * as React from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Surface } from "./surface";
import { cn } from "@/shared/components/ui/utils";

type LoadingStateProps = {
  label?: string;
  lines?: number;
  className?: string;
  compact?: boolean;
};

function LoadingState({
  label = "Loading",
  lines = 3,
  className,
  compact = false,
}: LoadingStateProps) {
  return (
    <Surface variant="panel" padding={compact ? "md" : "lg"} className={cn("space-y-4", className)}>
      <div className="app-empty-state">{label}</div>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "rounded-[var(--app-radius-control)] bg-[var(--app-color-surface-inset)]",
              index === 0 ? "h-6 w-2/5" : "h-14 w-full"
            )}
          />
        ))}
      </div>
    </Surface>
  );
}

export { LoadingState };
