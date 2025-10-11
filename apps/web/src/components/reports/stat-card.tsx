"use client";

import React from "react";
import { Card } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  // allow callers to pass preformatted content (string, number, or React node)
  value: React.ReactNode;
  hint?: string;
  className?: string;
};

export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <Card
      className={`rounded-3xl border border-outline/40 bg-white px-5 py-4 shadow-sm ${className ?? ""}`}
    >
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </Card>
  );
}
