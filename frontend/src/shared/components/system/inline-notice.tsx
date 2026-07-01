import * as React from "react";
import { cn } from "@/shared/components/ui/utils";
import { Surface } from "./surface";

const accentByTone = {
  info: "var(--app-accent-cyan-soft)",
  success: "var(--app-accent-green-soft)",
  warning: "var(--app-accent-yellow-soft)",
  danger: "var(--app-color-status-danger)",
} as const;

type InlineNoticeProps = React.ComponentProps<"div"> & {
  tone?: keyof typeof accentByTone;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

function InlineNotice({
  className,
  tone = "info",
  icon,
  title,
  description,
  action,
  role,
  ...props
}: InlineNoticeProps) {
  const accentColor = accentByTone[tone];
  const resolvedRole = role ?? (tone === "danger" ? "alert" : "status");

  return (
    <Surface
      variant="panel"
      padding="md"
      accentColor={accentColor}
      className={cn(
        "app-inline-notice flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
      role={resolvedRole}
      aria-live={tone === "danger" ? "assertive" : "polite"}
      {...props}
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--app-radius-control)]"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 14%, transparent)`,
              color: accentColor,
            }}
          >
            {icon}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <h3 className="app-card-title">{title}</h3>
          {description ? <p className="app-helper max-w-2xl">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </Surface>
  );
}

export { InlineNotice };
