import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/components/ui/utils";

type AppSelectOption = {
  value: string;
  label: string;
};

type AppSelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: AppSelectOption[];
  className?: string;
};

function AppSelect({
  value,
  defaultValue,
  onValueChange,
  placeholder,
  options,
  className,
}: AppSelectProps) {
  return (
    <Select value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-12 rounded-[var(--app-radius-control)] border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-inset)] px-4 text-[var(--app-color-text-primary)] shadow-none",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="app-surface-overlay border-[var(--app-color-border-strong)] text-[var(--app-color-text-primary)]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { AppSelect, type AppSelectOption };
