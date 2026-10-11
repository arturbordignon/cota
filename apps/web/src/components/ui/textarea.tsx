import { forwardRef, TextareaHTMLAttributes } from "react";

import { fieldStyles } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          fieldStyles,
          "min-h-[96px] px-3 py-2.5 leading-relaxed read-only:bg-surface-muted read-only:focus:border-outline read-only:focus:ring-0",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
