import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/components/ui/utils";

const statusChipVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
  {
    variants: {
      tone: {
        neutral: "border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-inset)] text-[var(--app-color-text-secondary)]",
        success:
          "border-[color:color-mix(in_srgb,var(--app-accent-green-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-green-soft)_12%,transparent)] text-[var(--app-accent-green-soft)]",
        warning:
          "border-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_12%,transparent)] text-[var(--app-accent-yellow-soft)]",
        danger:
          "border-[color:color-mix(in_srgb,var(--app-accent-red-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-red-soft)_12%,transparent)] text-[var(--app-accent-red-soft)]",
        info:
          "border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_12%,transparent)] text-[var(--app-accent-cyan-soft)]",
        accent:
          "border-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_12%,transparent)] text-[var(--app-accent-purple-soft)]",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

function StatusChip({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusChipVariants>) {
  return <span className={cn(statusChipVariants({ tone, className }))} {...props} />;
}

export { StatusChip };
