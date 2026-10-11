"use client";

import React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  // allow callers to pass preformatted content (string, number, or React node)
  value: React.ReactNode;
  hint?: string;
  className?: string;
};

export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <Card className={cn("px-5 py-4", className)}>
      <p className="meta-label">{label}</p>
      <div className="tabular mt-2 font-display text-[28px] font-semibold leading-none text-ink">
        {value}
      </div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </Card>
  );
}
