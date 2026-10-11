import { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("block text-[13px] font-semibold leading-none text-ink", className)}
      {...props}
    />
  );
}
