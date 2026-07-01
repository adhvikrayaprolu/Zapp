import * as React from "react";
import { Surface } from "./surface";
import { cn } from "@/shared/components/ui/utils";

type ListRowProps = React.ComponentProps<"div"> & {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

function ListRow({ leading, trailing, children, className, ...props }: ListRowProps) {
  return (
    <Surface variant="inset" padding="sm" className={cn("flex items-center justify-between gap-4", className)} {...props}>
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">{children}</div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </Surface>
  );
}

export { ListRow };
