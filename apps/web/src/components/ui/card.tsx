import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "glass-panel bg-white/85 shadow-sm transition-shadow hover:shadow-lg",
      className
    )}
    {...props}
  />
));

Card.displayName = "Card";
