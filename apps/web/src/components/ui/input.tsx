import { forwardRef, InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

// Shared by Input, Textarea and the Select trigger so every field reads the same.
export const fieldStyles =
  "w-full rounded-lg border border-outline bg-white text-sm text-ink shadow-card transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted/80 hover:border-ink/30 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/25 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted disabled:shadow-none aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          fieldStyles,
          "flex h-10 px-3 read-only:bg-surface-muted read-only:focus:border-outline read-only:focus:ring-0",
          type === "number" && "tabular",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
