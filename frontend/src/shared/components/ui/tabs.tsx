"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "app-surface-inset inline-flex min-h-12 w-full flex-wrap items-center gap-2 rounded-[var(--app-radius-panel)] p-2 sm:w-auto",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "app-button inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[var(--app-radius-control)] border border-transparent px-4 py-2 text-[0.6875rem] font-black uppercase tracking-[0.18em] whitespace-nowrap text-[var(--app-color-text-tertiary)] transition-[color,box-shadow,background-color,border-color] hover:text-[var(--app-color-text-secondary)] data-[state=active]:border-[var(--app-color-border-strong)] data-[state=active]:bg-[var(--app-color-surface-base)] data-[state=active]:text-[var(--app-color-text-primary)] data-[state=active]:shadow-[var(--app-shadow-interactive)] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
