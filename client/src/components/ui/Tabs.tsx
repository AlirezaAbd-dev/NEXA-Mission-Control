import React, { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabsVariant = "default" | "underline";

interface TabsContextType {
  value: string;
  onValueChange: (val: string) => void;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextType | null>(null);

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  variant?: TabsVariant;
  className?: string;
  children: ReactNode;
}

export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  variant = "default",
  className,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = value !== undefined ? value : internalValue;

  const handleValueChange = (val: string) => {
    if (value === undefined) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider
      value={{ value: activeValue, onValueChange: handleValueChange, variant }}
    >
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const context = useContext(TabsContext);
  const variant = context?.variant || "default";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        variant === "default" &&
          "inline-flex min-h-11 flex-wrap items-center rounded-xl bg-muted/70 p-1 text-muted-foreground",
        variant === "underline" &&
          "flex items-center gap-4 border-b border-[var(--nexa-divider)] pb-px",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  disabled = false,
  className,
  children,
}: {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;
  const variant = context.variant;

  return (
    <button
      type="button"
      role="tab"
      data-nexa-tab={variant}
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center gap-2 min-h-9 whitespace-nowrap text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          (isActive
            ? "rounded-lg px-3 py-1.5"
            : "rounded-lg px-3 py-1.5 hover:bg-muted/80 hover:text-foreground"),
        variant === "underline" &&
          (isActive
            ? "py-2 px-2.5 border-b-2 -mb-px border-primary text-primary font-bold"
            : "py-2 px-2.5 border-b-2 -mb-px border-transparent text-muted-foreground hover:text-foreground"),
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={cn("outline-none animate-in fade-in-50 duration-200", className)}
    >
      {children}
    </div>
  );
}
