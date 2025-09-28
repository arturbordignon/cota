"use client";

import { useState } from "react";
import { ChartLine, Sparkle, Table as TableIcon } from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const suggestions = [
  "Receita por cliente nos últimos 90 dias",
  "Taxa de conversão mensal por consultor",
  "Tempo médio entre proposta e faturamento",
  "Propostas enviadas por segmento",
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

type ReportPayload = {
  sql: string;
  visualization: string;
  range: {
    start: string;
    end: string;
  };
  result: unknown;
};

type MiniMetric = {
  label: string;
  value: string;
  change?: string;
};

type LineChartConfig = {
  type: "line";
  data: Array<{ name: string; value: number; target?: number }>;
  valueFormatter?: (value: number) => string;
};

type BarChartConfig = {
  type: "bar";
  data: Array<{ name: string; value: number; color?: string }>;
  valueFormatter?: (value: number) => string;
};

type TableChartConfig = {
  type: "table";
  columns: string[];
  rows: (string | number)[][];
};

type FunnelChartConfig = {
  type: "funnel";
  data: Array<{ name: string; value: number }>;
  valueFormatter?: (value: number) => string;
};

type ReportCard = {
  id: string;
  title: string;
  description: string;
  period: string;
  changeLabel?: string;
  metrics: MiniMetric[];
  content: LineChartConfig | BarChartConfig | TableChartConfig | FunnelChartConfig;
};

const formatPercent = (value: number, options?: { signed?: boolean; decimals?: number }) => {
  const decimals = options?.decimals ?? 1;
  const percent = value * 100;
  const pow = Math.pow(10, decimals);
  const rounded = Math.round(percent * pow) / pow;
  const formatted = Math.abs(rounded).toFixed(decimals).replace('.', ',');
  if (options?.signed) {
    const sign = rounded >= 0 ? '+' : '-';
    return `${sign}${formatted}%`;
  }
  return `${formatted}%`;
};
const toCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const performanceReports: ReportCard[] = [
  {
    id: 'conversion',
    title: 'Taxa de conversão',
    description: 'Percentual de propostas aceitas versus enviadas.',
    period: 'Últimos 8 meses',
    changeLabel: '+5,4% vs. período anterior',
    metrics: [
      { label: 'Taxa média', value: '62%', change: '+3%' },
      { label: 'Propostas enviadas', value: '148' },
      { label: 'Aceites', value: '92' },
      { label: 'Meta', value: '65%' },
    ],
    content: {
      type: 'line',
      data: [
        { name: 'Set', value: 0.45, target: 0.55 },
        { name: 'Out', value: 0.48, target: 0.57 },
        { name: 'Nov', value: 0.52, target: 0.58 },
        { name: 'Dez', value: 0.55, target: 0.6 },
        { name: 'Jan', value: 0.6, target: 0.62 },
        { name: 'Fev', value: 0.63, target: 0.63 },
        { name: 'Mar', value: 0.65, target: 0.64 },
        { name: 'Abr', value: 0.68, target: 0.65 },
      ],
      valueFormatter: (value) => formatPercent(value),
    },
  },
  {
    id: 'cycle',
    title: 'Ciclo médio',
    description: 'Dias entre criação e aceite das propostas comerciais.',
    period: 'Último semestre',
    metrics: [
      { label: 'Ciclo atual', value: '21 dias', change: '-2 dias' },
      { label: 'Ciclo alvo', value: '18 dias' },
      { label: 'Melhor mês', value: '19 dias' },
    ],
    content: {
      type: 'line',
      data: [
        { name: 'Nov', value: 30, target: 24 },
        { name: 'Dez', value: 28, target: 23 },
        { name: 'Jan', value: 26, target: 22 },
        { name: 'Fev', value: 24, target: 21 },
        { name: 'Mar', value: 22, target: 20 },
        { name: 'Abr', value: 21, target: 19 },
      ],
      valueFormatter: (value) => `${value.toFixed(0)} dias`,
    },
  },
];

const performanceDetail = [
  { consultant: 'Ana Souza', proposals: 24, accepted: 18, conversion: 0.75, cycle: 18 },
  { consultant: 'Marcos Dias', proposals: 21, accepted: 14, conversion: 0.67, cycle: 20 },
  { consultant: 'Fernanda Alves', proposals: 18, accepted: 10, conversion: 0.56, cycle: 23 },
  { consultant: 'João Lima', proposals: 15, accepted: 9, conversion: 0.6, cycle: 24 },
];

const revenueReports: ReportCard[] = [
  {
    id: 'revenue-clients',
    title: 'Receita por cliente',
    description: 'Top clientes pelo valor contratado nos últimos 90 dias.',
    period: '90 dias',
    metrics: [
      { label: 'Ticket médio', value: 'R$ 18,4 mil' },
      { label: 'Clientes ativos', value: '27' },
    ],
    content: {
      type: 'bar',
      data: [
        { name: 'Atlas', value: 42000 },
        { name: 'MetalF.', value: 36500 },
        { name: 'LogInt.', value: 29800 },
        { name: 'SkyLift', value: 22100 },
        { name: 'Rodarte', value: 18700 },
        { name: 'PortLoad', value: 16400 },
      ],
      valueFormatter: toCurrency,
    },
  },
  {
    id: 'segment-table',
    title: 'Receita por segmento',
    description: 'Resumo de propostas e faturamento por segmento.',
    period: 'Últimos 60 dias',
    metrics: [
      { label: 'Segmentos', value: '6' },
      { label: 'Receita total', value: 'R$ 612 mil' },
    ],
    content: {
      type: 'table',
      columns: ['Segmento', 'Propostas', 'Receita', 'Taxa de aceite'],
      rows: [
        ['Construção Pesada', 38, 'R$ 280.000', '68%'],
        ['Logística', 22, 'R$ 142.500', '59%'],
        ['Energia', 18, 'R$ 110.200', '64%'],
        ['Industrial', 14, 'R$ 79.500', '57%'],
        ['Portuário', 9, 'R$ 54.800', '72%'],
        ['Agrícola', 7, 'R$ 45.600', '61%'],
      ],
    },
  },
];

const revenueDetail = [
  { segment: 'Construção', clients: 8, avgTicket: 23500, growth: 0.18 },
  { segment: 'Logística', clients: 6, avgTicket: 19800, growth: 0.12 },
  { segment: 'Energia', clients: 5, avgTicket: 22100, growth: 0.09 },
  { segment: 'Industrial', clients: 4, avgTicket: 19875, growth: -0.04 },
];

const operationsReports: ReportCard[] = [
  {
    id: 'pipeline',
    title: 'Pipeline operacional',
    description: 'Quantidade de propostas por etapa do processo comercial.',
    period: 'Mensal',
    metrics: [
      { label: 'Total negociado', value: 'R$ 1,8 mi' },
      { label: 'Fechadas', value: '68' },
      { label: 'Taxa de avanço', value: '31%' },
    ],
    content: {
      type: 'funnel',
      data: [
        { name: 'Criadas', value: 220 },
        { name: 'Enviadas', value: 180 },
        { name: 'Negociação', value: 110 },
        { name: 'Fechadas', value: 68 },
        { name: 'Faturadas', value: 54 },
      ],
      valueFormatter: (value) => `${value} propostas`,
    },
  },
  {
    id: 'team-performance',
    title: 'Performance por consultor',
    description: 'Propostas enviadas, aceites e ticket médio por membro da equipe.',
    period: 'Últimos 30 dias',
    metrics: [
      { label: 'Equipe ativa', value: '8 membros' },
    ],
    content: {
      type: 'table',
      columns: ['Consultor', 'Enviadas', 'Aceites', 'Ticket médio'],
      rows: [
        ['Ana Souza', 24, '18', 'R$ 19.200'],
        ['Marcos Dias', 21, '14', 'R$ 16.450'],
        ['Fernanda Alves', 18, '10', 'R$ 14.800'],
        ['João Lima', 15, '9', 'R$ 13.100'],
      ],
    },
  },
];

const operationsDetail = [
  { stage: 'Criadas', duration: '-', dropoff: 0 },
  { stage: 'Enviadas', duration: '3 dias', dropoff: 0.18 },
  { stage: 'Negociação', duration: '9 dias', dropoff: 0.39 },
  { stage: 'Fechadas', duration: '6 dias', dropoff: 0.38 },
  { stage: 'Faturadas', duration: '4 dias', dropoff: 0.21 },
];

function LineChartViz(config: LineChartConfig) {
  const formatter = config.valueFormatter ?? ((value: number) => value.toLocaleString('pt-BR'));
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={config.data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" />
          <XAxis dataKey="name" stroke="var(--color-muted)" />
          <YAxis stroke="var(--color-muted)" tickFormatter={formatter} width={70} />
          <Tooltip formatter={(value: number) => formatter(value)} contentStyle={{ borderRadius: 12 }} labelStyle={{ fontWeight: 600 }} />
          <Legend />
          <Line type="monotone" dataKey="value" name="Realizado" stroke="var(--color-primary)" strokeWidth={3} dot />
          {config.data.some((item) => item.target !== undefined) ? (
            <Line type="monotone" dataKey="target" name="Meta" stroke="var(--color-success)" strokeDasharray="4 4" />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarChartViz(config: BarChartConfig) {
  const formatter = config.valueFormatter ?? toCurrency;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={config.data} margin={{ top: 8, right: 16, bottom: 24, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-muted)" />
          <YAxis stroke="var(--color-muted)" tickFormatter={(value) => formatter(value)} width={70} />
          <Tooltip formatter={(value: number) => formatter(value)} contentStyle={{ borderRadius: 12 }} />
          <Bar dataKey="value" radius={[12, 12, 4, 4]}>
            <LabelList position="top" formatter={(value: number) => formatter(value)} />
            {config.data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color ?? `hsl(35 ${66 - index * 8}% ${55 - index * 4}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelChartViz(config: FunnelChartConfig) {
  const formatter = config.valueFormatter ?? ((value: number) => `${value}`);
  const first = config.data[0]?.value ?? 0;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip
            formatter={(value: number, _name, payload) => {
              const percent = first ? Math.round((value / first) * 100) : 0;
              return [`${formatter(value)} (${percent}%)`, payload?.name];
            }}
            contentStyle={{ borderRadius: 12 }}
          />
          <Funnel
            data={config.data.map((item, index) => ({
              ...item,
              fill: `hsl(215 ${65 - index * 6}% ${60 - index * 4}%)`,
            }))}
            dataKey="value"
            nameKey="name"
            isAnimationActive={false}
          >
            <LabelList position="right" formatter={(value: number) => `${value}`} fill="var(--color-muted)" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportTable({ columns, rows }: TableChartConfig) {
  return (
    <div className="overflow-auto rounded-lg border border-outline/40">
      <table className="w-full min-w-[360px] text-left text-xs">
        <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-semibold uppercase tracking-wide">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="even:bg-[var(--color-surface-muted)]/30">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 text-ink">
                  {typeof cell === 'number' ? cell.toLocaleString('pt-BR') : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderContent(content: ReportCard['content']) {
  switch (content.type) {
    case 'line':
      return <LineChartViz {...content} />;
    case 'bar':
      return <BarChartViz {...content} />;
    case 'funnel':
      return <FunnelChartViz {...content} />;
    case 'table':
      return <ReportTable {...content} />;
    default:
      return null;
  }
}

export default function ReportsPage() {
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [visualization, setVisualization] = useState<'table' | 'bar' | 'line'>('table');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);

  const parseRange = (value: string) => {
    const parts = value.split('-').map((part) => part.trim());
    if (parts.length === 2) {
      const start = new Date(parts[0]);
      const end = new Date(parts[1]);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return { start: start.toISOString(), end: end.toISOString() };
      }
    }
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    return { start: past.toISOString(), end: now.toISOString() };
  };

  const handleGenerate = async () => {
    if (!query) {
      setError('Descreva o que deseja analisar.');
      return;
    }

    if (!API_BASE) {
      setError('Configure NEXT_PUBLIC_API_BASE_URL para gerar relatórios.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/reports/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          visualization,
          dateRange: parseRange(dateRange),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: 'Não foi possível gerar o relatório.' }));
        setError(payload.message ?? 'Não foi possível gerar o relatório.');
        setReport(null);
        return;
      }

      const payload = (await response.json()) as { data: ReportPayload };
      setReport(payload.data);
    } catch (err) {
      console.error(err);
      setError('Erro inesperado ao gerar relatório.');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setDateRange('');
    setReport(null);
    setError(null);
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Relatórios dinâmicos"
        description="Peça insights com linguagem natural. Geramos a consulta SQL e apresentamos os dados como tabela ou gráfico."
      />

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="flex w-full flex-wrap gap-2">
          <TabsTrigger value="performance">Performance comercial</TabsTrigger>
          <TabsTrigger value="revenue">Receita & clientes</TabsTrigger>
          <TabsTrigger value="operations">Pipeline & operações</TabsTrigger>
          <TabsTrigger value="custom">Gerador personalizado</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="grid gap-4 lg:grid-cols-2">
            {performanceReports.map((card) => (
              <Card key={card.id} className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{card.title}</h3>
                    <p className="text-xs text-muted">{card.description}</p>
                  </div>
                  <Badge tone="info">{card.period}</Badge>
                </div>
                {card.changeLabel ? <p className="text-xs font-medium text-success">{card.changeLabel}</p> : null}
                <div className="border-b border-outline/20 pb-4">{renderContent(card.content)}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {card.metrics.map((metric) => (
                    <div key={metric.label} className="space-y-1 rounded-lg bg-[var(--color-surface-muted)]/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted">{metric.label}</p>
                      <p className="text-sm font-semibold text-ink">{metric.value}</p>
                      {metric.change ? <p className="text-xs text-success">{metric.change}</p> : null}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-4 p-6">
            <h3 className="text-sm font-semibold text-ink">Painel por consultor</h3>
            <p className="text-xs text-muted">Detalhamento de produtividade, conversão e ciclo médio por membro da equipe.</p>
            <div className="mt-3 overflow-auto rounded-lg border border-outline/40">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Consultor</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Propostas</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Aceites</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Taxa</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Ciclo médio</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceDetail.map((row) => (
                    <tr key={row.consultant} className="even:bg-[var(--color-surface-muted)]/30">
                      <td className="px-4 py-2 text-ink">{row.consultant}</td>
                      <td className="px-4 py-2 text-ink">{row.proposals}</td>
                      <td className="px-4 py-2 text-ink">{row.accepted}</td>
                      <td className="px-4 py-2 text-ink">{formatPercent(row.conversion)}</td>
                      <td className="px-4 py-2 text-ink">{row.cycle} dias</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <div className="grid gap-4 lg:grid-cols-2">
            {revenueReports.map((card) => (
              <Card key={card.id} className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{card.title}</h3>
                    <p className="text-xs text-muted">{card.description}</p>
                  </div>
                  <Badge tone="info">{card.period}</Badge>
                </div>
                {card.changeLabel ? <p className="text-xs font-medium text-success">{card.changeLabel}</p> : null}
                <div className="border-b border-outline/20 pb-4">{renderContent(card.content)}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {card.metrics.map((metric) => (
                    <div key={metric.label} className="space-y-1 rounded-lg bg-[var(--color-surface-muted)]/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted">{metric.label}</p>
                      <p className="text-sm font-semibold text-ink">{metric.value}</p>
                      {metric.change ? <p className="text-xs text-success">{metric.change}</p> : null}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-4 p-6">
            <h3 className="text-sm font-semibold text-ink">KPI por segmento</h3>
            <p className="text-xs text-muted">Clientes ativos, ticket médio e crescimento em relação ao período anterior.</p>
            <div className="mt-3 overflow-auto rounded-lg border border-outline/40">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Segmento</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Clientes</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Ticket médio</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Crescimento</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueDetail.map((row) => (
                    <tr key={row.segment} className="even:bg-[var(--color-surface-muted)]/30">
                      <td className="px-4 py-2 text-ink">{row.segment}</td>
                      <td className="px-4 py-2 text-ink">{row.clients}</td>
                      <td className="px-4 py-2 text-ink">{toCurrency(row.avgTicket)}</td>
                      <td className={row.growth >= 0 ? "px-4 py-2 text-success" : "px-4 py-2 text-danger"}>
                        {formatPercent(row.growth, { signed: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <div className="grid gap-4 lg:grid-cols-2">
            {operationsReports.map((card) => (
              <Card key={card.id} className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{card.title}</h3>
                    <p className="text-xs text-muted">{card.description}</p>
                  </div>
                  <Badge tone="info">{card.period}</Badge>
                </div>
                {card.changeLabel ? <p className="text-xs font-medium text-success">{card.changeLabel}</p> : null}
                <div className="border-b border-outline/20 pb-4">{renderContent(card.content)}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {card.metrics.map((metric) => (
                    <div key={metric.label} className="space-y-1 rounded-lg bg-[var(--color-surface-muted)]/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted">{metric.label}</p>
                      <p className="text-sm font-semibold text-ink">{metric.value}</p>
                      {metric.change ? <p className="text-xs text-success">{metric.change}</p> : null}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-4 p-6">
            <h3 className="text-sm font-semibold text-ink">Tempo por etapa</h3>
            <p className="text-xs text-muted">Visão detalhada do tempo médio e percentual de queda em cada fase do pipeline.</p>
            <div className="mt-3 overflow-auto rounded-lg border border-outline/40">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Etapa</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Tempo médio</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wide">Queda</th>
                  </tr>
                </thead>
                <tbody>
                  {operationsDetail.map((row) => (
                    <tr key={row.stage} className="even:bg-[var(--color-surface-muted)]/30">
                      <td className="px-4 py-2 text-ink">{row.stage}</td>
                      <td className="px-4 py-2 text-ink">{row.duration}</td>
                      <td className="px-4 py-2 text-ink">{row.dropoff ? formatPercent(row.dropoff) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <div className="space-y-4">
            <Card className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="report-intent">O que você deseja analisar?</Label>
                <Textarea
                  id="report-intent"
                  placeholder="Ex: Qual foi a taxa de conversão de propostas em fevereiro?"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <p className="text-xs text-muted">
                  Nenhuma integração de IA em produção ainda — exibimos a consulta gerada para validação antes da execução.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Visualização desejada</Label>
                  <Select value={visualization} onValueChange={(value) => setVisualization(value as typeof visualization)}>
                    <SelectItem value="table">Tabela</SelectItem>
                    <SelectItem value="bar">Gráfico de barras</SelectItem>
                    <SelectItem value="line">Gráfico de linhas</SelectItem>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateRange">Intervalo (datas)</Label>
                  <Input
                    id="dateRange"
                    placeholder="01/02/2025 - 29/02/2025"
                    value={dateRange}
                    onChange={(event) => setDateRange(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sugestões rápidas</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="rounded-full border border-outline bg-[var(--color-surface-muted)] px-4 py-1.5 text-xs font-semibold text-muted transition hover:border-primary hover:text-ink"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-xs text-muted">
                  <Sparkle size={16} className="text-primary" />
                  Tradução natural → SQL será exibida para confirmação antes de consultar o banco.
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleClear}>
                    Limpar
                  </Button>
                  <Button onClick={handleGenerate} disabled={isLoading}>
                    {visualization === 'table' ? <TableIcon size={16} className="mr-2" /> : <ChartLine size={16} className="mr-2" />}
                    {isLoading ? 'Gerando...' : 'Gerar relatório'}
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Consulta SQL</h3>
                  <Badge tone="info">Preview</Badge>
                </div>
                <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-[var(--color-surface-muted)]/60 p-4 text-xs text-muted">
                  {report?.sql ?? 'A consulta gerada aparecerá aqui após solicitar um relatório.'}
                </pre>
              </Card>

              <Card className="flex flex-col gap-4 border border-dashed border-outline px-6 py-6 text-sm text-muted">
                {error ? (
                  <p>{error}</p>
                ) : report ? (
                  Array.isArray(report.result) ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink">Resultados</p>
                      <div className="overflow-auto rounded-lg border border-outline/40">
                        <table className="w-full min-w-[360px] text-left text-xs">
                          <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
                            <tr>
                              {Object.keys((report.result as Record<string, unknown>[])[0] ?? {}).map((key) => (
                                <th key={key} className="px-4 py-3 font-semibold uppercase tracking-wide">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(report.result as Record<string, unknown>[]).map((row, rowIndex) => (
                              <tr key={rowIndex} className="even:bg-[var(--color-surface-muted)]/30">
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="px-4 py-2 text-ink">
                                    {typeof value === 'number'
                                      ? value.toLocaleString('pt-BR')
                                      : String(value ?? '—')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink">Retorno bruto</p>
                      <pre className="max-h-60 overflow-auto rounded-lg bg-[var(--color-surface-muted)]/60 p-4 text-xs text-muted">
                        {JSON.stringify(report.result, null, 2)}
                      </pre>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-ink">Aguardando geração</p>
                    <p>Solicite um relatório acima e exibiremos os dados aqui.</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
