import * as React from "react";
import { cn } from "@/shared/components/ui/utils";

type SectionHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "left" | "center";
  level?: 1 | 2 | 3 | 4;
  className?: string;
  titleClassName?: string;
  actionClassName?: string;
};

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  level = 2,
  className,
  titleClassName,
  actionClassName,
}: SectionHeaderProps) {
  const centered = align === "center";
  const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:gap-6",
        centered ? "items-center text-center" : "sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="space-y-3">
        {eyebrow ? <div className="app-eyebrow">{eyebrow}</div> : null}
        <HeadingTag className={cn("app-section-title", titleClassName)}>{title}</HeadingTag>
        {description ? <p className={cn("app-helper max-w-2xl", centered && "mx-auto")}>{description}</p> : null}
      </div>
      {action ? (
        <div className={cn("w-full shrink-0 sm:w-auto", centered && "flex justify-center", actionClassName)}>{action}</div>
      ) : null}
    </div>
  );
}

export { SectionHeader };
