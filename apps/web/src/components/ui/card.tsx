import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border border-border bg-white shadow-card", className)}
    {...props}
  />
));

Card.displayName = "Card";

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-sans text-[15px] font-semibold leading-snug text-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-[13px] leading-relaxed text-muted", className)} {...props} />;
}
