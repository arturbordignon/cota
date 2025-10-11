"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Cell,
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

type TooltipPayloadItem = { dataKey?: string; name?: string; value?: number };
function TooltipContent({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg bg-white p-2 text-xs shadow" style={{ minWidth: 120 }}>
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} className="flex justify-between px-1">
          <div className="text-muted">{p.name}</div>
          <div className="font-medium">{numberFormatter(Number(p.value ?? 0))}</div>
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
        <BarChart data={prepared} margin={{ top: 8, right: 16, bottom: 24, left: -10 }}>
          <defs>
            <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0.75} />
            </linearGradient>
            <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-muted)" />
          <YAxis stroke="var(--color-muted)" tickFormatter={(v) => numberFormatter(Number(v))} />
          <Tooltip contentStyle={{ borderRadius: 12 }} content={<TooltipContent />} />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12 }} />

          <Bar
            dataKey="total"
            name="Propostas"
            stackId={stacked ? "a" : undefined}
            fill="url(#g1)"
            radius={[12, 12, 4, 4]}
          >
            <LabelList
              position="top"
              formatter={(v: React.ReactNode) => numberFormatter(Number(String(v ?? "0")))}
            />
            {prepared.map((entry, index) => (
              <Cell key={`c-${index}`} fill={index % 2 === 0 ? "url(#g1)" : "var(--color-info)"} />
            ))}
          </Bar>
          <Bar
            dataKey="aceitas"
            name="Aceitas"
            stackId={stacked ? "a" : undefined}
            fill="url(#g2)"
            radius={[12, 12, 4, 4]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
