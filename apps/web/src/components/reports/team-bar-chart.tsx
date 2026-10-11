"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type TeamBarChartDatum = {
  name: string;
  total: number;
  aceitas: number;
};

type TeamBarChartProps = {
  data: TeamBarChartDatum[];
  height?: number;
  stacked?: boolean;
  className?: string;
};

function numberFormatter(value: number) {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

type TooltipPayloadItem = { dataKey?: string; name?: string; value?: number; color?: string };
function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-[150px] rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-raised">
      {label ? <p className="mb-1.5 font-semibold text-ink">{label}</p> : null}
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted">
            <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tabular font-semibold text-ink">{numberFormatter(Number(p.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

export function TeamBarChart({
  data,
  height = 256,
  stacked = false,
  className,
}: TeamBarChartProps) {
  const prepared = useMemo(() => (data || []).map((d) => ({ ...d })), [data]);

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={prepared} margin={{ top: 8, right: 8, bottom: 8, left: -12 }} barGap={2} barSize={20}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: "var(--color-outline)" }}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            tickFormatter={(v) => numberFormatter(Number(v))}
          />
          <Tooltip cursor={{ fill: "var(--color-surface-muted)" }} content={<TooltipContent />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            formatter={(value) => <span style={{ color: "var(--color-ink-muted)" }}>{value}</span>}
          />

          <Bar
            dataKey="total"
            name="Propostas"
            stackId={stacked ? "a" : undefined}
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="aceitas"
            name="Aceitas"
            stackId={stacked ? "a" : undefined}
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
