import * as React from "react";
import { cn } from "@/shared/components/ui/utils";

type IconBadgeProps = React.ComponentProps<"div"> & {
  tone?: "cyan" | "green" | "blue" | "purple" | "red" | "yellow" | "neutral";
  size?: "sm" | "md" | "lg";
};

const toneStyles = {
  cyan:
    "bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_12%,transparent)] text-[var(--app-accent-cyan-soft)] border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_25%,transparent)]",
  green:
    "bg-[color:color-mix(in_srgb,var(--app-accent-green-soft)_12%,transparent)] text-[var(--app-accent-green-soft)] border-[color:color-mix(in_srgb,var(--app-accent-green-soft)_25%,transparent)]",
  blue:
    "bg-[color:color-mix(in_srgb,var(--app-accent-blue-soft)_12%,transparent)] text-[var(--app-accent-blue-soft)] border-[color:color-mix(in_srgb,var(--app-accent-blue-soft)_25%,transparent)]",
  purple:
    "bg-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_12%,transparent)] text-[var(--app-accent-purple-soft)] border-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_25%,transparent)]",
  red:
    "bg-[color:color-mix(in_srgb,var(--app-accent-red-soft)_12%,transparent)] text-[var(--app-accent-red-soft)] border-[color:color-mix(in_srgb,var(--app-accent-red-soft)_25%,transparent)]",
  yellow:
    "bg-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_12%,transparent)] text-[var(--app-accent-yellow-soft)] border-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_25%,transparent)]",
  neutral: "bg-[var(--app-color-surface-inset)] text-[var(--app-color-text-secondary)] border-[var(--app-color-border-strong)]",
} as const;

const sizeStyles = {
  sm: "size-10 rounded-[var(--app-radius-md)] [&_svg]:size-4",
  md: "size-12 rounded-[var(--app-radius-control)] [&_svg]:size-5",
  lg: "size-16 rounded-[var(--app-radius-control)] [&_svg]:size-8",
} as const;

function IconBadge({
  className,
  tone = "neutral",
  size = "md",
  ...props
}: IconBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center border",
        toneStyles[tone],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}

export { IconBadge };
