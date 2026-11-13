"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "");
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [controlledValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn("w-full space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#F4F4F5] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] w-fit max-w-full text-xs font-heading font-semibold",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isSelected = context.value === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "flex items-center justify-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer shrink-0",
        isSelected
          ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border border-transparent shadow-xs"
          : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/20 hover:border-[var(--primary)]/45 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1E1E1E] dark:border-[#333333] dark:text-[#D0D0D0] dark:hover:text-[#F5F5F5] dark:hover:bg-[#262626]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
