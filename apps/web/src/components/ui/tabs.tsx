"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsRootProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: TabsRootProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(defaultValue ?? "");

  const value = controlledValue ?? uncontrolledValue;

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value,
      setValue: (next) => {
        if (controlledValue === undefined) {
          setUncontrolledValue(next);
        }
        onValueChange?.(next);
      },
    }),
    [value, controlledValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("space-y-5", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    // The baseline is an inset shadow on the list, not a border with a -1px
    // overlap, so nothing spills out of the scroll box and adds a scrollbar.
    <div className={cn("overflow-x-auto overflow-y-hidden", className)}>
      <div
        role="tablist"
        className="flex min-w-max items-end gap-6 shadow-[inset_0_-1px_0_rgb(var(--rgb-border))]"
      >
        {children}
      </div>
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

export function TabsTrigger({ value, children, className, ...props }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs");
  }

  const isActive = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => context.setValue(value)}
      className={cn(
        "relative whitespace-nowrap border-b-2 px-0.5 pb-3 pt-1 text-sm font-semibold transition-colors",
        isActive
          ? "border-primary text-ink"
          : "border-transparent text-muted hover:border-outline hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsContent must be used within Tabs");
  }

  if (context.value !== value) {
    return null;
  }

  return (
    <div role="tabpanel" className={cn(className)}>
      {children}
    </div>
  );
}

export type { TabsRootProps as TabsProps };
