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
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="inline-flex min-w-max items-center gap-1 rounded-lg border border-outline bg-white p-1">
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
  let classeAtivo = "text-muted hover:text-ink";
  if (isActive) {
    classeAtivo = "bg-primary text-ink";
  }

  return (
    <button
      type="button"
      onClick={() => context.setValue(value)}
      className={cn(
        "relative rounded-md px-3 py-1.5 text-sm font-medium transition",
        classeAtivo,
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

  return <div className={cn(className)}>{children}</div>;
}

export type { TabsRootProps as TabsProps };
