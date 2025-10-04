'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TeamBarChartDatum = {
  name: string;
  total: number;
  aceitas: number;
};

type TeamBarChartProps = {
  data: TeamBarChartDatum[];
  height?: number; // default 256px
  stacked?: boolean; // set true to stack total+aceitas
  className?: string;
};

export function TeamBarChart({
  data,
  height = 256,
  stacked = false,
  className,
}: TeamBarChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-muted)" />
          <YAxis stroke="var(--color-muted)" />
          <Tooltip contentStyle={{ borderRadius: 12 }} />
          <Bar
            dataKey="total"
            name="Propostas"
            stackId={stacked ? 'a' : undefined}
            fill="var(--color-info)"
            radius={[12, 12, 4, 4]}
          >
            <LabelList position="top" />
          </Bar>
          <Bar
            dataKey="aceitas"
            name="Aceitas"
            stackId={stacked ? 'a' : undefined}
            fill="var(--color-success)"
            radius={[12, 12, 4, 4]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
