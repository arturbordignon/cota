import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline bg-white px-6 py-14 text-center",
        className
      )}
    >
      {icon ? (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
          {icon}
        </span>
      ) : null}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
