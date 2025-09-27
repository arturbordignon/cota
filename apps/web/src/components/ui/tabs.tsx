"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type TabItem = {
  id: string;
  label: string;
  description?: string;
};

interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  onChange?: (id: string) => void;
}

export function Tabs({ items, defaultValue, onChange }: TabsProps) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.id);

  const handleSelect = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max items-center gap-2 rounded-full bg-surface/80 p-1">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "text-muted hover:bg-primary-soft hover:text-ink"
              )}
            >
              {item.label}
            </button>
          );
        })}
        </div>
      </div>
      {items.find((item) => item.id === active)?.description ? (
        <p className="text-xs text-muted sm:text-sm">
          {items.find((item) => item.id === active)?.description}
        </p>
      ) : null}
    </div>
  );
}

export { TabItem };
