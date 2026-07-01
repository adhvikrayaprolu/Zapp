import * as React from "react";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/components/ui/utils";

type FormFieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  labelClassName?: string;
};

function FormField({
  label,
  htmlFor,
  helperText,
  errorText,
  className,
  children,
  labelClassName,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className={cn("app-label", labelClassName)}>
          {label}
        </Label>
      ) : null}
      {children}
      {errorText ? <p className="app-error">{errorText}</p> : helperText ? <p className="app-helper">{helperText}</p> : null}
    </div>
  );
}

export { FormField };
