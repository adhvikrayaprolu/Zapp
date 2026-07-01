"use client";

import * as React from "react";
import { Toaster as Sonner, ToasterProps } from "sonner";
import { useAppThemeMode } from "@/shared/theme-provider";

const Toaster = ({ ...props }: ToasterProps) => {
  const { mode } = useAppThemeMode();

  return (
    <Sonner
      theme={mode}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
