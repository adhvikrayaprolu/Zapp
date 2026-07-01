import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/components/ui/utils";

function AppDialog(props: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />;
}

function AppDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "app-surface-overlay max-w-xl gap-0 border-[var(--app-color-border-strong)] p-0 text-[var(--app-color-text-primary)]",
        className
      )}
      {...props}
    />
  );
}

function AppDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <DialogHeader className={cn("gap-3 px-6 pt-6 pb-4 pr-20 text-left sm:px-8 sm:pt-8 sm:pb-5", className)} {...props} />;
}

function AppDialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-6 pb-6 sm:px-8 sm:pb-8", className)} {...props} />;
}

function AppDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter className={cn("border-t border-[var(--app-color-border-subtle)] px-6 py-5 sm:px-8 sm:py-6", className)} {...props} />;
}

function AppDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={cn("app-section-title text-left", className)} {...props} />;
}

function AppDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription className={cn("app-helper text-left", className)} {...props} />;
}

export {
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
};
