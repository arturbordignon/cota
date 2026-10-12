import { cn } from "@/lib/utils";

// The level mark from construction drawings: a half-filled triangle resting on the line.
// "Cota" is both that elevation mark and short for "cotação".
export function CotaSymbol({
  size = 28,
  inverted = false,
  className,
}: {
  size?: number;
  inverted?: boolean;
  className?: string;
}) {
  const solid = inverted ? "#FFFFFF" : "rgb(var(--rgb-primary))";
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 48 48" className={cn("shrink-0", className)}>
      <path d="M7 7H24V37Z" fill="rgb(var(--rgb-accent))" />
      <path d="M24 7H41L24 37Z" fill={solid} />
      <rect x="3" y="37" width="42" height="4.5" rx="2.25" fill={solid} />
    </svg>
  );
}

// App-icon tile: the symbol on petrol.
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg bg-primary", className)}
    >
      <CotaSymbol inverted size={Math.round(size * 0.64)} />
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CotaSymbol size={30} />
      {compact ? (
        <span className="sr-only">Cota</span>
      ) : (
        <span className="font-brand text-[27px] font-bold leading-none tracking-[-0.04em] text-primary">cota</span>
      )}
    </span>
  );
}
