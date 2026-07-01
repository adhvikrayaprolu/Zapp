import * as React from "react";
import { Surface } from "./surface";
import { cn } from "@/shared/components/ui/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Surface variant="panel" padding="lg" className={cn("text-center", className)}>
      {icon ? <div className="mb-4 flex justify-center text-[var(--app-color-text-tertiary)]">{icon}</div> : null}
      <div className="space-y-2">
        <h3 className="app-card-title">{title}</h3>
        {description ? <p className="app-helper mx-auto max-w-md">{description}</p> : null}
      </div>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </Surface>
  );
}

export { EmptyState };
