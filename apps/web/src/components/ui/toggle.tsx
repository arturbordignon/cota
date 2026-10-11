"use client";

import { Check } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed: boolean;
  onPressedChange: () => void;
}

// On/off chip for a single permission or option.
export function Toggle({ pressed, onPressedChange, className, children, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPressedChange}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
        pressed
          ? "border-primary/50 bg-primary-soft text-ink hover:bg-primary-soft/70"
          : "border-outline bg-white text-muted hover:border-ink/25 hover:text-ink",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
          pressed ? "border-primary bg-primary text-white" : "border-outline bg-white text-transparent"
        )}
      >
        <Check size={10} weight="bold" />
      </span>
      {children}
    </button>
  );
}
