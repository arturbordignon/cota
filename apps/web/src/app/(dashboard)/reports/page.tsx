"use client";

import { useMemo, useState } from "react";
import { ChartLine, Sparkle, Table as TableIcon } from "@phosphor-icons/react";
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
} from "recharts";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { ReportsOverviewResponse } from "@/types/api";

const suggestions = [
  "Receita por cliente nos últimos 90 dias",
  "Taxa de conversão mensal por consultor",
  "Tempo médio entre proposta e faturamento",
  "Propostas enviadas por segmento",
];

type ReportPayload = {
  sql: string;
  visualization: string;
  range: {
    start: string;
    end: string;
  };
  result: unknown;
};

const toCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const STATUS_BADGES: Record<string, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
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

type BarDatum = { name: string; value: number; color?: string };

function BarChartViz({ data, valueFormatter }: { data: BarDatum[]; valueFormatter?: (value: number) => string }) {
  const formatter = valueFormatter ?? ((value: number) => value.toLocaleString('pt-BR'));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-muted)" />
          <YAxis stroke="var(--color-muted)" tickFormatter={(value) => formatter(value)} width={70} />
          <Tooltip formatter={(value: number) => formatter(value)} contentStyle={{ borderRadius: 12 }} />
          <Bar dataKey="value" radius={[12, 12, 4, 4]}>
            <LabelList position="top" formatter={(value: number) => formatter(value)} />
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color ?? `hsl(215 ${65 - index * 6}% ${58 - index * 3}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type FunnelDatum = { name: string; value: number };

function FunnelChartViz({ data, valueFormatter }: { data: FunnelDatum[]; valueFormatter?: (value: number) => string }) {
  const formatter = valueFormatter ?? ((value: number) => value.toLocaleString('pt-BR'));
  const first = data[0]?.value ?? 0;
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
            data={data.map((item, index) => ({
              ...item,
              fill: `hsl(215 ${65 - index * 6}% ${60 - index * 4}%)`,
            }))}
            dataKey="value"
            nameKey="name"
            isAnimationActive={false}
          >
            <LabelList position="right" formatter={(value: number) => formatter(value)} fill="var(--color-muted)" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}

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

export default function ReportsPage() {
  const api = useApi();
  const overviewQuery = useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: () => api.get<ReportsOverviewResponse>('/reports/overview'),
    enabled: Boolean(api.token),
  });
  const overview = overviewQuery.data?.data;
  const isTokenMissing = !api.token;

  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [visualization, setVisualization] = useState<'table' | 'bar' | 'line'>('table');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);

  const overviewError = overviewQuery.error as Error | null;
  const statusEntries = useMemo(() => {
    if (!overview?.proposalsByStatus) return [] as Array<{ status: string; label: string; count: number; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }>;
    return Object.entries(overview.proposalsByStatus).map(([status, count]) => {
      const entry = STATUS_BADGES[status] ?? STATUS_BADGES.default;
      return { status, label: entry.label, count, tone: entry.tone };
    });
  }, [overview?.proposalsByStatus]);

  const topClients = useMemo(() => overview?.topClients ?? [], [overview?.topClients]);
  const recentProposals = useMemo(() => overview?.recentProposals ?? [], [overview?.recentProposals]);
  const pipelineSummary = useMemo(() => overview?.pipelineSummary ?? [], [overview?.pipelineSummary]);

  const totalProposals = useMemo(() => statusEntries.reduce((acc, entry) => acc + entry.count, 0), [statusEntries]);

  const statusChartData = useMemo(() =>
    statusEntries.map((entry) => ({
      name: entry.label,
      value: entry.count,
      color: TONE_COLORS[entry.tone],
    })),
  [statusEntries]);

  const topClientsChartData = useMemo(() =>
    topClients.map((client) => ({
      name: client.client,
      value: client.value ?? 0,
    })),
  [topClients]);

  const pipelineChartData = useMemo(
    () => pipelineSummary.map((stage) => ({ name: stage.name, value: stage.leadCount })),
    [pipelineSummary]
  );

  const totalPipelineLeads = useMemo(
    () => pipelineSummary.reduce((acc, stage) => acc + stage.leadCount, 0),
    [pipelineSummary]
  );

  const totalPipelineValue = useMemo(
    () => pipelineSummary.reduce((acc, stage) => acc + (stage.totalValue ?? 0), 0),
    [pipelineSummary]
  );

  const pipelineTableRows = useMemo(
    () =>
      pipelineSummary.map((stage) => [
        stage.name,
        stage.leadCount,
        stage.totalValue != null ? toCurrency(stage.totalValue) : '—',
      ]),
    [pipelineSummary]
  );

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

    if (!api.token) {
      setError('Autentique-se para gerar relatórios.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = await api.post<{ data: ReportPayload }>('/reports/run', {
        question: query,
        visualization,
        dateRange: parseRange(dateRange),
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
    setDateRange('');
    setReport(null);
    setError(null);
  };

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para consultar seus dados reais.
        </Card>
      ) : null}

      {overviewError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          Não foi possível carregar os indicadores: {overviewError.message}
        </Card>
      ) : null}

      {overview && statusEntries.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {statusEntries.map((entry) => (
            <Card key={entry.status} className="rounded-3xl border border-outline/40 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted">{entry.label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{entry.count}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {overview ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 space-y-3 border border-outline/40 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Top clientes (últimas propostas aceitas)</h3>
              <Badge tone="info">Atualizado</Badge>
            </div>
            <div className="overflow-auto rounded-lg border border-outline/40">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="bg-[var(--color-surface-muted)]/40 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.slice(0, 5).map((client) => (
                    <tr key={client.client} className="border-t border-outline/30">
                      <td className="px-4 py-2 text-ink">{client.client}</td>
                      <td className="px-4 py-2 text-right text-primary">{toCurrency(client.value)}</td>
                    </tr>
                  ))}
                  {topClients.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-muted">
                        Nenhum cliente com propostas aceitas neste período.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="space-y-3 border border-outline/40 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Propostas recentes</h3>
              <Badge tone="neutral">Últimos 30 dias</Badge>
            </div>
            <div className="space-y-2 text-sm">
              {recentProposals.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg border border-outline/30 bg-[var(--color-surface-muted)]/40 px-3 py-2">
                  <p className="font-semibold text-ink">{item.title ?? 'Sem título'}</p>
                  <p className="text-xs text-muted">{item.client ?? 'Sem cliente'} • {new Date(item.createdAt).toLocaleDateString('pt-BR')}</p>
                  <Badge tone={STATUS_BADGES[item.status]?.tone ?? 'neutral'} className="mt-1">
                    {STATUS_BADGES[item.status]?.label ?? item.status}
                  </Badge>
                </div>
              ))}
              {recentProposals.length === 0 ? (
                <p className="rounded-lg border border-dashed border-outline/40 bg-white/80 px-3 py-4 text-center text-xs text-muted">
                  Nenhuma proposta criada no período.
                </p>
              ) : null}
            </div>
          </Card>
        </div>
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

        <TabsContent value="overview">
          {overviewQuery.isLoading ? (
            <Card className="p-6 text-sm text-muted">Carregando indicadores...</Card>
          ) : overview ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Propostas por status</h3>
                    <Badge tone="neutral">{totalProposals.toLocaleString('pt-BR')} no período</Badge>
                  </div>
                  {statusChartData.length > 0 ? (
                    <BarChartViz data={statusChartData} valueFormatter={(value) => Number(value).toLocaleString('pt-BR')} />
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
                    <BarChartViz data={topClientsChartData} valueFormatter={(value) => toCurrency(Number(value))} />
                  ) : (
                    <p className="text-xs text-muted">Nenhum cliente com propostas aceitas ainda.</p>
                  )}
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Resumo do pipeline</h3>
                    <Badge tone="info">
                      {totalPipelineLeads.toLocaleString('pt-BR')} leads • {toCurrency(totalPipelineValue)}
                    </Badge>
                  </div>
                  {pipelineTableRows.length > 0 ? (
                    <SimpleTable columns={['Etapa', 'Leads', 'Valor estimado']} rows={pipelineTableRows} />
                  ) : (
                    <p className="text-xs text-muted">Cadastre etapas e leads no pipeline para acompanhar aqui.</p>
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

              <Card className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Propostas recentes</h3>
                  <Badge tone="neutral">Últimos 30 dias</Badge>
                </div>
                <div className="overflow-auto rounded-lg border border-outline/40">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Título</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Cliente</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Criada em</th>
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
                            <td className="px-4 py-2 text-ink">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
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
