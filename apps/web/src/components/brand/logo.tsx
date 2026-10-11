import { Crane } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-press",
        className
      )}
    >
      <Crane size={Math.round(size * 0.58)} weight="bold" />
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      {compact ? (
        <span className="sr-only">Crane Proposals</span>
      ) : (
        <span className="font-display text-[19px] font-semibold leading-none tracking-[-0.01em] text-ink">
          Crane <span className="text-ink-muted">Proposals</span>
        </span>
      )}
    </span>
  );
}
