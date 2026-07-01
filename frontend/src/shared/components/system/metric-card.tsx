import * as React from "react";
import { Surface } from "./surface";
import { cn } from "@/shared/components/ui/utils";

type MetricCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

function MetricCard({ label, value, detail, action, className }: MetricCardProps) {
  return (
    <Surface variant="card" padding="md" className={cn("space-y-3", className)}>
      <div className="app-eyebrow">{label}</div>
      <div className="text-3xl font-black tracking-tight text-[var(--app-color-text-primary)]">{value}</div>
      {detail ? <p className="app-helper">{detail}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </Surface>
  );
}

export { MetricCard };
