import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/components/ui/utils";

const appButtonVariants = cva(
  "app-button inline-flex items-center justify-center gap-2 whitespace-nowrap border text-sm font-black outline-none transition-all disabled:pointer-events-none disabled:opacity-55 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[var(--app-color-action-primary-bg)] text-[var(--app-color-action-primary-fg)] shadow-[var(--app-shadow-interactive)] hover:brightness-110 active:scale-[0.99]",
        info:
          "border-transparent bg-[var(--app-accent-cyan-soft)] text-[var(--app-color-text-inverse)] shadow-[var(--app-shadow-interactive)] hover:brightness-110 active:scale-[0.99]",
        secondary:
          "border-[var(--app-color-border-strong)] bg-[var(--app-color-action-secondary-bg)] text-[var(--app-color-action-secondary-fg)] hover:border-[var(--app-color-border-focus)] hover:bg-[var(--app-color-surface-base)]",
        quiet:
          "border-transparent bg-transparent text-[var(--app-color-action-quiet-fg)] hover:bg-[var(--app-color-surface-inset)] hover:text-[var(--app-color-text-primary)]",
        quietAccent:
          "border-transparent bg-transparent text-[var(--app-accent-cyan-soft)] hover:bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_10%,transparent)] hover:text-[var(--app-accent-cyan-soft)]",
        quietDanger:
          "border-transparent bg-transparent text-[var(--app-color-status-danger)] hover:bg-[color:color-mix(in_srgb,var(--app-color-status-danger)_10%,transparent)] hover:text-[var(--app-color-status-danger)]",
        outline:
          "border-[var(--app-color-border-strong)] bg-transparent text-[var(--app-color-text-primary)] hover:bg-[var(--app-color-surface-inset)]",
        danger:
          "border-transparent bg-[var(--app-color-status-danger)] text-white shadow-[0_0_24px_rgba(255,77,77,0.18)] hover:brightness-105",
        success:
          "border-[color:color-mix(in_srgb,var(--app-accent-green-soft)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-green-soft)_16%,transparent)] text-[var(--app-accent-green-soft)] hover:bg-[color:color-mix(in_srgb,var(--app-accent-green-soft)_22%,transparent)]",
        accent:
          "border-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_16%,transparent)] text-[var(--app-accent-purple-soft)] hover:bg-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_22%,transparent)]",
        floating:
          "border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-overlay)] text-[var(--app-color-text-secondary)] shadow-[var(--app-shadow-raised)] hover:text-[var(--app-color-text-primary)] hover:shadow-[var(--app-shadow-interactive)]",
        hero:
          "border-transparent bg-[var(--app-color-action-primary-bg)] text-[var(--app-color-action-primary-fg)] shadow-[var(--app-shadow-interactive)] hover:scale-[1.01] hover:brightness-105 active:scale-[0.99]",
      },
      size: {
        sm: "h-10 rounded-[var(--app-radius-md)] px-4 text-xs uppercase tracking-[0.18em]",
        md: "h-12 rounded-[var(--app-radius-control)] px-5 text-sm",
        lg: "h-14 rounded-[var(--app-radius-control)] px-6 text-sm",
        hero: "h-16 rounded-[var(--app-radius-panel)] px-8 text-xs uppercase tracking-[0.24em]",
        icon: "size-12 rounded-[var(--app-radius-control)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type AppButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof appButtonVariants> & {
    asChild?: boolean;
  };

function AppButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: AppButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(appButtonVariants({ variant, size, className }))} {...props} />;
}

export { AppButton, appButtonVariants };
