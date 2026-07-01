import * as React from "react";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/components/ui/utils";

type AppTextareaProps = React.ComponentProps<typeof Textarea> & {
  size?: "md" | "lg";
};

function AppTextarea({ className, size = "md", ...props }: AppTextareaProps) {
  return (
    <Textarea
      className={cn(
        "rounded-[var(--app-radius-control)] border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-inset)] px-4 py-3 text-[var(--app-color-text-primary)] placeholder:text-[var(--app-color-text-tertiary)] shadow-none focus-visible:border-ring",
        size === "md" ? "min-h-28" : "min-h-36 text-base",
        className
      )}
      {...props}
    />
  );
}

export { AppTextarea };
