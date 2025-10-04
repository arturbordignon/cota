'use client';

import React, { memo, useMemo, useState } from 'react';
import { ChartLine, Table as TableIcon } from '@phosphor-icons/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useApi } from '@/hooks/use-api';
import { ReportsOverviewResponse } from '@/types/api';

import { StatCard } from '@/components/reports/stat-card';
import { TeamBarChart } from '@/components/reports/team-bar-chart';
import { DateRangePicker } from '@/components/reports/date-range-picker';

const suggestions = [
  'Receita por cliente nos últimos 90 dias',
  'Taxa de conversão mensal por consultor',
  'Tempo médio entre proposta e faturamento',
  'Propostas enviadas por segmento',
];

type ReportPayload = {
  sql: string;
  visualization: 'table' | 'bar' | 'line';
  range: { start: string; end: string };
  result: unknown;
};

type Range = { from?: Date; to?: Date };

const toCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const STATUS_BADGES: Record<
  string,
  { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }
> = {
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
  PENDING: { label: 'Pendente', tone: 'warning' },
  SENT: { label: 'Enviada', tone: 'info' },
  ACCEPTED: { label: 'Aceita', tone: 'success' },
  DECLINED: { label: 'Recusada', tone: 'danger' },
  EXPIRED: { label: 'Expirada', tone: 'danger' },
  default: { label: 'Outros', tone: 'neutral' },
};

const TONE_COLORS: Record<'neutral' | 'info' | 'warning' | 'success' | 'danger', string> = {
  neutral: 'var(--color-outline)',
  info: 'var(--color-primary)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
};

// Palette for generic series
const CATEGORICAL_COLORS = [
  'var(--color-info)',
  'hsl(20 90% 54%)',
  'hsl(158 64% 45%)',
  'hsl(262 83% 58%)',
  'hsl(192 91% 36%)',
  'hsl(340 82% 52%)',
];

/* ----------------------- small presentational bits ---------------------- */

type BarDatum = { name: string; value: number; color?: string };
const BarChartViz = memo(function BarChartViz({
  data,
  valueFormatter,
}: {
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
}) {
  const formatter = valueFormatter ?? ((value: number) => value.toLocaleString('pt-BR'));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-muted)" />
          <YAxis
            stroke="var(--color-muted)"
            tickFormatter={(value) => formatter(Number(value))}
            width={70}
          />
          <Tooltip
            formatter={(value: number) => formatter(value)}
            contentStyle={{ borderRadius: 12 }}
          />
          <Bar dataKey="value" radius={[12, 12, 4, 4]}>
            <LabelList position="top" formatter={(value: number) => formatter(value)} />
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

type FunnelDatum = { name: string; value: number };
const FunnelChartViz = memo(function FunnelChartViz({
  data,
  valueFormatter,
}: {
  data: FunnelDatum[];
  valueFormatter?: (value: number) => string;
}) {
  const formatter = valueFormatter ?? ((value: number) => value.toLocaleString('pt-BR'));
  const first = data[0]?.value ?? 0;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip
            formatter={(value: number, _name, payload) => {
              const percent = first ? Math.round((Number(value) / first) * 100) : 0;
              return [`${formatter(Number(value))} (${percent}%)`, (payload as any)?.name];
            }}
            contentStyle={{ borderRadius: 12 }}
          />
          <Funnel
            data={data.map((item, index) => ({
              ...item,
              fill: `hsl(215 ${65 - index * 6}% ${60 - index * 4}%)`,
            }))}
            dataKey="value"
            nameKey="name"
            isAnimationActive={false}
          >
            <LabelList
              position="right"
              formatter={(value: number) => formatter(value)}
              fill="var(--color-muted)"
            />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
});

function SimpleTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
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

/* --------------------------------- page --------------------------------- */

export default function ReportsPage() {
  const api = useApi();
  const isTokenMissing = !api.token;

  /* ----------------------- Visão Geral - date handling ----------------------- */
  const [pendingSel, setPendingSel] = useState<Range>();
  const [appliedSel, setAppliedSel] = useState<Range>();

  const overviewParsed = useMemo(() => {
    const now = new Date();
    const end = appliedSel?.to ?? now;
    const start = appliedSel?.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Normalize
    const startIso = new Date(new Date(start).setHours(0, 0, 0, 0)).toISOString();
    const endIso = new Date(new Date(end).setHours(23, 59, 59, 999)).toISOString();
    return { start: startIso, end: endIso };
  }, [appliedSel]);

  const overviewQuery = useQuery({
    queryKey: ['reports', 'overview', overviewParsed.start, overviewParsed.end],
    queryFn: () =>
      api.get<ReportsOverviewResponse>(
        `/reports/overview?start=${overviewParsed.start}&end=${overviewParsed.end}`,
      ),
    enabled: Boolean(api.token),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const overview = overviewQuery.data?.data;
  const overviewError = overviewQuery.error as Error | null;

  /* -------------------------- Custom generator state ------------------------- */
  const [query, setQuery] = useState('');
  const [customSel, setCustomSel] = useState<Range>();
  const [visualization, setVisualization] = useState<'table' | 'bar' | 'line'>('table');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);

  /* ----------------------------- Derived overview ---------------------------- */
  const statusEntries = useMemo(() => {
    if (!overview?.proposalsByStatus)
      return [] as Array<{
        status: string;
        label: string;
        count: number;
        tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
      }>;
    return Object.entries(overview.proposalsByStatus).map(([status, count]) => {
      const entry = STATUS_BADGES[status] ?? STATUS_BADGES.default;
      return { status, label: entry.label, count: Number(count), tone: entry.tone };
    });
  }, [overview?.proposalsByStatus]);

  const topClients = overview?.topClients ?? [];
  const recentProposals = overview?.recentProposals ?? [];
  const pipelineSummary = overview?.pipelineSummary ?? [];

  // Optional fields if your backend sends them
  const propostasPorMembro = (overview as any)?.propostasPorMembro ?? [];
  const receitaPorCidade = (overview as any)?.receitaPorCidade ?? [];
  const kpis = (overview as any)?.kpis ?? null;
  const range = (overview as any)?.range ?? overviewParsed;

  const totalProposals = useMemo(
    () => statusEntries.reduce((acc, entry) => acc + entry.count, 0),
    [statusEntries],
  );

  const statusChartData = useMemo(
    () =>
      statusEntries.map((entry) => ({
        name: entry.label,
        value: entry.count,
        color: TONE_COLORS[entry.tone],
      })),
    [statusEntries],
  );

  const topClientsChartData = useMemo(
    () => topClients.map((client) => ({ name: client.client, value: client.value ?? 0 })),
    [topClients],
  );

  const teamChartData = useMemo(
    () =>
      propostasPorMembro.map((m: any) => ({
        name: m.createdByName ?? m.createdById ?? '—',
        total: Number(m.total ?? 0),
        aceitas: Number(m.aceitas ?? 0),
      })),
    [propostasPorMembro],
  );

  const receitaCidadeChartData = useMemo(
    () => receitaPorCidade.map((c: any) => ({ name: c.city, value: Number(c.value ?? 0) })),
    [receitaPorCidade],
  );

  const pipelineChartData = useMemo(
    () =>
      pipelineSummary.map((stage) => ({ name: stage.name, value: Number(stage.leadCount ?? 0) })),
    [pipelineSummary],
  );

  const totalPipelineLeads = useMemo(
    () => pipelineSummary.reduce((acc, stage) => acc + Number(stage.leadCount ?? 0), 0),
    [pipelineSummary],
  );

  const totalPipelineValue = useMemo(
    () => pipelineSummary.reduce((acc, stage) => acc + Number(stage.totalValue ?? 0), 0),
    [pipelineSummary],
  );

  const pipelineTableRows = useMemo(
    () =>
      pipelineSummary.map((stage) => [
        stage.name,
        Number(stage.leadCount ?? 0),
        stage.totalValue != null ? toCurrency(Number(stage.totalValue)) : '—',
      ]),
    [pipelineSummary],
  );

  /* ----------------------------- custom: generate ---------------------------- */

  const handleGenerate = async () => {
    if (!query) {
      setError('Descreva o que deseja analisar.');
      return;
    }
    if (!api.token) {
      setError('Autentique-se para gerar relatórios.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const end = customSel?.to ?? now;
      const start = customSel?.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const payload = await api.post<{ data: ReportPayload }>('/reports/run', {
        question: query,
        visualization,
        dateRange: {
          start: new Date(new Date(start).setHours(0, 0, 0, 0)).toISOString(),
          end: new Date(new Date(end).setHours(23, 59, 59, 999)).toISOString(),
        },
      });
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
    setCustomSel(undefined);
    setReport(null);
    setError(null);
  };

  /* ---------------------------------- render --------------------------------- */

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para consultar seus dados
          reais.
        </Card>
      ) : null}

      {overviewError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          Não foi possível carregar os indicadores: {overviewError.message}
        </Card>
      ) : null}

      <PageHeader
        title="Relatórios dinâmicos"
        description="Peça insights com linguagem natural. Geramos a consulta SQL e apresentamos os dados como tabela ou gráfico."
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex w-full flex-wrap gap-2">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="custom">Gerador personalizado</TabsTrigger>
        </TabsList>

        {/* ------------------------- VISÃO GERAL ------------------------- */}
        <TabsContent value="overview">
          {overviewQuery.isLoading ? (
            <Card className="p-6 text-sm text-muted">Carregando indicadores...</Card>
          ) : overview ? (
            <div className="space-y-4">
              {/* Range selector with Apply */}
              <Card className="p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                  <div className="space-y-1.5">
                    <Label>Intervalo (Visão geral)</Label>
                    <DateRangePicker value={pendingSel} onChange={setPendingSel} />
                    <p className="text-[11px] text-muted">Sem seleção = últimos 30 dias.</p>
                  </div>
                  <div className="flex gap-2 justify-self-start sm:justify-self-end">
                    <Badge tone="info" className="self-center">
                      Período: {new Date(overviewParsed.start).toLocaleDateString('pt-BR')} —{' '}
                      {new Date(overviewParsed.end).toLocaleDateString('pt-BR')}
                    </Badge>
                    <Button size="sm" onClick={() => setAppliedSel(pendingSel)} type="button">
                      Aplicar
                    </Button>
                  </div>
                </div>
              </Card>

              {/* KPIs (optional) */}
              {kpis ? (
                <div className="grid gap-4 lg:grid-cols-4">
                  <StatCard
                    label="Receita (aceitas)"
                    value={toCurrency(Number(kpis.receitaAceita ?? 0))}
                    hint="Soma das propostas aceitas"
                  />
                  <StatCard
                    label="Taxa de conversão"
                    value={`${Number(kpis.taxaConversao ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`}
                    hint="Aceitas ÷ Total"
                  />
                  <StatCard
                    label="Ticket médio (aceitas)"
                    value={toCurrency(Number(kpis.ticketMedioAceitas ?? 0))}
                  />
                  <StatCard
                    label="Propostas abertas 14d+"
                    value={Number(kpis.propostasAbertas14dMais ?? 0).toLocaleString('pt-BR')}
                    hint="Atenção: priorizar follow-up"
                  />
                </div>
              ) : null}

              {/* Status + Receita por cliente */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Propostas por status</h3>
                    <Badge tone="neutral">
                      {totalProposals.toLocaleString('pt-BR')} no período
                    </Badge>
                  </div>
                  {statusChartData.length > 0 ? (
                    <BarChartViz
                      data={statusChartData}
                      valueFormatter={(value) => Number(value).toLocaleString('pt-BR')}
                    />
                  ) : (
                    <p className="text-xs text-muted">Sem propostas registradas neste período.</p>
                  )}
                </Card>

                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Receita por cliente</h3>
                    <Badge tone="info">Top 5</Badge>
                  </div>
                  {topClientsChartData.length > 0 ? (
                    <BarChartViz
                      data={topClientsChartData}
                      valueFormatter={(value) => toCurrency(Number(value))}
                    />
                  ) : (
                    <p className="text-xs text-muted">
                      Nenhum cliente com propostas aceitas ainda.
                    </p>
                  )}
                </Card>
              </div>

              {/* Propostas por consultor */}
              <Card className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Propostas por consultor</h3>
                  <Badge tone="neutral">Total vs Aceitas</Badge>
                </div>
                {teamChartData.length > 0 ? (
                  <TeamBarChart data={teamChartData} />
                ) : (
                  <p className="text-xs text-muted">Nenhuma proposta atribuída a membros.</p>
                )}
              </Card>

              {/* Receita por cidade (opcional) */}
              {receitaCidadeChartData.length > 0 ? (
                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Receita por cidade</h3>
                    <Badge tone="info">Top 8</Badge>
                  </div>
                  <BarChartViz
                    data={receitaCidadeChartData}
                    valueFormatter={(v) => toCurrency(Number(v))}
                  />
                </Card>
              ) : null}

              {/* Pipeline resumo + funil */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Resumo do pipeline</h3>
                    <Badge tone="info">
                      {totalPipelineLeads.toLocaleString('pt-BR')} leads •{' '}
                      {toCurrency(totalPipelineValue)}
                    </Badge>
                  </div>
                  {pipelineTableRows.length > 0 ? (
                    <SimpleTable
                      columns={['Etapa', 'Leads', 'Valor estimado']}
                      rows={pipelineTableRows}
                    />
                  ) : (
                    <p className="text-xs text-muted">
                      Cadastre etapas e leads no pipeline para acompanhar aqui.
                    </p>
                  )}
                </Card>

                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Distribuição do pipeline</h3>
                    <Badge tone="neutral">Leads por etapa</Badge>
                  </div>
                  {pipelineChartData.length > 0 ? (
                    <FunnelChartViz
                      data={pipelineChartData}
                      valueFormatter={(value) => `${Number(value).toLocaleString('pt-BR')} leads`}
                    />
                  ) : (
                    <p className="text-xs text-muted">Nenhum lead nas etapas do pipeline.</p>
                  )}
                </Card>
              </div>

              {/* Propostas recentes */}
              <Card className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Propostas recentes</h3>
                  <Badge tone="neutral">
                    {range?.start ? new Date(range.start).toLocaleDateString('pt-BR') : '—'} —{' '}
                    {range?.end ? new Date(range.end).toLocaleDateString('pt-BR') : '—'}
                  </Badge>
                </div>
                <div className="overflow-auto rounded-lg border border-outline/40">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Título</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Cliente</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">
                          Criada em
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProposals.length > 0 ? (
                        recentProposals.map((item) => (
                          <tr key={item.id} className="even:bg-[var(--color-surface-muted)]/30">
                            <td className="px-4 py-2 text-ink">{item.title ?? 'Sem título'}</td>
                            <td className="px-4 py-2 text-ink">{item.client ?? 'Sem cliente'}</td>
                            <td className="px-4 py-2 text-ink">
                              <Badge tone={STATUS_BADGES[item.status]?.tone ?? 'neutral'}>
                                {STATUS_BADGES[item.status]?.label ?? item.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-ink">
                              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-muted">
                            Nenhuma proposta criada no período analisado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-6 text-sm text-muted">Nenhum dado disponível ainda.</Card>
          )}
        </TabsContent>

        {/* ------------------------- GERADOR PERSONALIZADO ------------------------- */}
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
                  Nenhuma integração de IA em produção ainda — exibimos a consulta gerada para
                  validação antes da execução.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Visualização desejada</Label>
                  <Select
                    value={visualization}
                    onValueChange={(value) => setVisualization(value as typeof visualization)}
                  >
                    <SelectItem value="table">Tabela</SelectItem>
                    <SelectItem value="bar">Gráfico de barras</SelectItem>
                    <SelectItem value="line">Gráfico de linhas</SelectItem>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Intervalo (datas)</Label>
                  <DateRangePicker value={customSel} onChange={setCustomSel} />
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
                <div className="inline-flex items-center gap-2 text-xs text-muted" />
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleClear}>
                    Limpar
                  </Button>
                  <Button onClick={handleGenerate} disabled={isLoading}>
                    {visualization === 'table' ? (
                      <TableIcon size={16} className="mr-2" />
                    ) : (
                      <ChartLine size={16} className="mr-2" />
                    )}
                    {isLoading ? 'Gerando...' : 'Gerar relatório'}
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="flex flex-col gap-4 border border-dashed border-outline px-6 py-6 text-sm text-muted lg:col-span-2">
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
                              {Object.keys(
                                (report.result as Record<string, unknown>[])[0] ?? {},
                              ).map((key) => (
                                <th
                                  key={key}
                                  className="px-4 py-3 font-semibold uppercase tracking-wide"
                                >
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(report.result as Record<string, unknown>[]).map((row, rowIndex) => (
                              <tr
                                key={rowIndex}
                                className="even:bg-[var(--color-surface-muted)]/30"
                              >
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
