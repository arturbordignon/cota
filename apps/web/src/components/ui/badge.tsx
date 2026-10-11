import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "info" | "danger" | "brand";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  dot?: boolean;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-ink-muted ring-ink/10",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  info: "bg-info-soft text-info ring-info/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
  brand: "bg-primary-soft text-primary-strong ring-primary/30",
};

export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {dot ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
