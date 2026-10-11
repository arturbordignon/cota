"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

// One-of-many choice that applies immediately (filters, periods, presets).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  size = "md",
  className,
}: SegmentedProps<T>) {
  return (
    <div className={cn("max-w-full overflow-x-auto", className)}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="inline-flex min-w-max items-center gap-0.5 rounded-lg bg-surface-sunken/70 p-1"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "whitespace-nowrap rounded-md font-semibold transition-[background-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50",
                size === "sm" ? "h-7 px-2.5 text-[13px]" : "h-8 px-3 text-[13px]",
                active
                  ? "bg-white text-ink shadow-[0_1px_2px_rgb(27_31_36/0.10),0_0_0_1px_rgb(27_31_36/0.06)]"
                  : "text-muted hover:text-ink"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
