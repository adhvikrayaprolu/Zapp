import * as React from "react";
import { cn } from "@/shared/components/ui/utils";

const widthClasses = {
  compact: "max-w-4xl",
  default: "max-w-5xl",
  wide: "max-w-6xl",
  full: "max-w-[1440px]",
} as const;

const spacingClasses = {
  compact: "space-y-8",
  default: "space-y-12",
  relaxed: "space-y-16",
} as const;

type AppPageProps = React.ComponentProps<"div"> & {
  width?: keyof typeof widthClasses;
  spacing?: keyof typeof spacingClasses;
};

function AppPage({
  className,
  width = "wide",
  spacing = "default",
  ...props
}: AppPageProps) {
  return (
    <div
      className={cn("app-page-shell pb-32", widthClasses[width], spacingClasses[spacing], className)}
      {...props}
    />
  );
}

export { AppPage };
