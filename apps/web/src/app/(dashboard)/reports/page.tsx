"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { memo, useCallback, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowClockwise, ChartLine, Table as TableIcon, Trophy } from "@phosphor-icons/react";
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
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { ReportsOverviewResponse } from "@/types/api";
import { StatCard } from "@/components/reports/stat-card";
import { TeamBarChart } from "@/components/reports/team-bar-chart";
import { DateRangePicker } from "@/components/reports/date-range-picker";

type ReportPayload = {
  sql: string;
  visualization: "table" | "bar" | "line";
  range: { start: string; end: string };
  result: unknown;
};

type Range = { from?: Date; to?: Date };

type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

const STATUS_TONES: Record<string, StatusTone> = {
  DRAFT: "neutral",
  PENDING: "warning",
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "danger",
  EXPIRED: "danger",
  default: "neutral",
};

const SUGGESTION_KEYS = ["revenue90", "conversionConsultant", "cycle", "segment"] as const;

// Status bars use the reserved status colors; the legend above names each one.
const TONE_COLORS: Record<"neutral" | "info" | "warning" | "success" | "danger", string> = {
  neutral: "var(--chart-neutral)",
  info: "var(--color-info)",
  warning: "var(--color-warning)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
};

// Funnel stages are ordinal, so they share one petrol ramp (dark → light).
const FUNNEL_RAMP = ["#0a3642", "#0f4c5c", "#00657e", "#00809f", "#3f9bb3", "#7ab8c9"];

const axisTick = { fill: "var(--color-muted)", fontSize: 12 };

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; payload?: { name?: string } }>;
  label?: string;
  formatter: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-raised">
      <p className="font-semibold text-ink">{label ?? item.payload?.name ?? item.name}</p>
      <p className="tabular mt-0.5 text-ink-muted">{formatter(Number(item.value ?? 0))}</p>
    </div>
  );
}

/* ----------------------- small presentational bits ---------------------- */

type BarDatum = { name: string; value: number; color?: string };
const BarChartViz = memo(function BarChartViz({
  data,
  valueFormatter,
}: {
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
}) {
  const defaultFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    [],
  );
  const formatter = valueFormatter ?? ((value: number) => defaultFormatter.format(value));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "var(--color-outline)" }} tick={axisTick} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickFormatter={(value) => formatter(Number(value))}
            width={72}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-muted)" }}
            content={<ChartTooltip formatter={formatter} />}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24} fill="var(--chart-1)">
            <LabelList
              position="top"
              fill="var(--color-ink-muted)"
              fontSize={12}
              formatter={(value) => formatter(Number(value))}
            />
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color ?? "var(--chart-1)"} />
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
  const defaultFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    [],
  );
  const formatter = valueFormatter ?? ((value: number) => defaultFormatter.format(value));
  const first = data[0]?.value ?? 0;
  const stages = data.map((item, index) => ({
    ...item,
    fill: FUNNEL_RAMP[Math.min(index, FUNNEL_RAMP.length - 1)],
  }));
  return (
    <div className="space-y-4">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <Tooltip
              formatter={(value: number, _name, payload) => {
                const percent = first ? Math.round((Number(value) / first) * 100) : 0;
                return [`${formatter(Number(value))} (${percent}%)`, (payload as any)?.name];
              }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                fontSize: 12,
                boxShadow: "0 12px 32px -12px rgb(27 31 36 / 0.22)",
              }}
            />
            <Funnel
              data={stages}
              dataKey="value"
              nameKey="name"
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </FunnelChart>
        </ResponsiveContainer>
      </div>
      {/* Stage names and counts, in funnel order, so color is never the only cue. */}
      <ol className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {stages.map((stage) => (
          <li key={stage.name} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-ink-muted">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: stage.fill }} />
              <span className="truncate">{stage.name}</span>
            </span>
            <span className="tabular shrink-0 font-semibold text-ink">{formatter(Number(stage.value))}</span>
          </li>
        ))}
      </ol>
    </div>
  );
});

function SimpleTable({
  columns,
  rows,
  formatNumber,
}: {
  columns: string[];
  rows: (string | number)[][];
  formatNumber: (value: number) => string;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="data-table data-table--compact min-w-[360px]">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={typeof cell === "number" ? "tabular text-ink" : "text-ink"}>
                  {typeof cell === "number" ? formatNumber(cell) : cell}
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
  const [activeTab, setActiveTab] = useState<"overview" | "custom">("overview");
  const formatter = useFormatter();
  const tPage = useTranslations("reports.page");
  const tOverview = useTranslations("reports.page.overview");
  const tCustom = useTranslations("reports.tabs.custom.form");
  const tCustomResult = useTranslations("reports.tabs.custom.resultCard");

  const formatCurrency = useCallback(
    (value: number) =>
      formatter.number(value, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
    [formatter],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      // formatter.number uses formatjs types which are slightly different from Intl.NumberFormatOptions
      // cast the options to any to avoid type mismatch while keeping runtime behavior
      formatter.number(value as any, (options ?? { maximumFractionDigits: 0 }) as any),
    [formatter],
  );

  const formatDate = useCallback(
    (value: string | Date) => formatter.dateTime(new Date(value), { dateStyle: "short" }),
    [formatter],
  );

  const formatPercent = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      // cast options to any to match the formatter.number signature from next-intl
      formatter.number(
        (value / 100) as any,
        {
          style: "percent",
          maximumFractionDigits: 1,
          ...options,
        } as any,
      ),
    [formatter],
  );

  const statusBadges = useMemo<Record<string, { label: string; tone: StatusTone }>>(
    () => ({
      DRAFT: { label: tOverview("status.labels.DRAFT"), tone: STATUS_TONES.DRAFT },
      PENDING: { label: tOverview("status.labels.PENDING"), tone: STATUS_TONES.PENDING },
      SENT: { label: tOverview("status.labels.SENT"), tone: STATUS_TONES.SENT },
      ACCEPTED: { label: tOverview("status.labels.ACCEPTED"), tone: STATUS_TONES.ACCEPTED },
      DECLINED: { label: tOverview("status.labels.DECLINED"), tone: STATUS_TONES.DECLINED },
      EXPIRED: { label: tOverview("status.labels.EXPIRED"), tone: STATUS_TONES.EXPIRED },
      default: { label: tOverview("status.labels.default"), tone: STATUS_TONES.default },
    }),
    [tOverview],
  );

  const suggestions = useMemo(
    () => SUGGESTION_KEYS.map((key) => tCustom(`suggestionValues.${key}`)),
    [tCustom],
  );
  const isTokenMissing = !api.token;

  /* ----------------------- Overview date handling ----------------------- */
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
    queryKey: ["reports", "overview", overviewParsed.start, overviewParsed.end],
    queryFn: () =>
      api.get<{ data: ReportsOverviewResponse }>(
        `/reports/overview?start=${overviewParsed.start}&end=${overviewParsed.end}`,
      ),
    enabled: Boolean(api.token),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const overview = overviewQuery.data?.data;
  const overviewError = overviewQuery.error as Error | null;

  /* -------------------------- Custom generator state ------------------------- */
  const [query, setQuery] = useState("");
  const [customSel, setCustomSel] = useState<Range>();
  const [visualization, setVisualization] = useState<"table" | "bar" | "line">("table");
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
        tone: StatusTone;
      }>;
    return Object.entries(overview.proposalsByStatus).map(([status, count]) => {
      const entry = statusBadges[status] ?? statusBadges.default;
      return { status, label: entry.label, count: Number(count), tone: entry.tone };
    });
  }, [overview?.proposalsByStatus, statusBadges]);

  const topClients: any[] = overview?.topClients ?? [];
  const recentProposals: any[] = overview?.recentProposals ?? [];
  const pipelineSummary: any[] = overview?.pipelineSummary ?? [];

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

  const { topClientsChartData, topClientsTotal } = useMemo(() => {
    const chartData = topClients.map((client) => ({
      name: client.client,
      value: client.value ?? 0,
    }));
    const total = chartData.reduce((acc, client) => acc + Number(client.value ?? 0), 0);
    return { topClientsChartData: chartData, topClientsTotal: total };
  }, [topClients]);

  const teamChartData = useMemo(
    () =>
      propostasPorMembro.map((m: any) => ({
        name: m.createdByName ?? m.createdById ?? "—",
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
        stage.totalValue != null ? formatCurrency(Number(stage.totalValue)) : "—",
      ]),
    [formatCurrency, pipelineSummary],
  );

  const recentRangeStart = range?.start
    ? formatDate(range.start)
    : tOverview("recentProposals.noDate");
  const recentRangeEnd = range?.end ? formatDate(range.end) : tOverview("recentProposals.noDate");

  const acceptedCount = useMemo(
    () => statusEntries.find((entry) => entry.status === "ACCEPTED")?.count ?? 0,
    [statusEntries],
  );

  const conversionRate = totalProposals ? (acceptedCount / totalProposals) * 100 : 0;
  const pipelineAverageValue = totalPipelineLeads ? totalPipelineValue / totalPipelineLeads : 0;
  const topPerformer = useMemo(() => {
    if (!teamChartData || teamChartData.length === 0) return null;
    const sorted = [...teamChartData].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));
    return sorted[0] ?? null;
  }, [teamChartData]);
  const upcomingHighlights = useMemo(() => recentProposals.slice(0, 3), [recentProposals]);

  /* ----------------------------- custom: generate ---------------------------- */

  const handleGenerate = async () => {
    if (!query) {
      setError(tCustom("errors.intent"));
      return;
    }
    if (!api.token) {
      setError(tCustom("errors.auth"));
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const end = customSel?.to ?? now;
      const start = customSel?.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const payload = await api.post<{ data: ReportPayload }>("/reports/run", {
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
      setError(tCustom("errors.unexpected"));
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setCustomSel(undefined);
    setReport(null);
    setError(null);
  };

  /* ---------------------------------- render --------------------------------- */

  return (
    <section className="space-y-6">
      <PageHeader title={tPage("header.title")} description={tPage("header.description")} />

      {isTokenMissing ? <Notice tone="warning">{tPage("alerts.missingToken")}</Notice> : null}

      {overviewError && !isTokenMissing ? (
        <Notice tone="danger">{tPage("alerts.loadError", { error: overviewError.message })}</Notice>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "custom")}>
        <TabsList>
          <TabsTrigger value="overview">{tPage("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="custom">{tPage("tabs.custom")}</TabsTrigger>
        </TabsList>

        {/* ------------------------- VISÃO GERAL ------------------------- */}
        <TabsContent value="overview">
          {overviewQuery.isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-72 rounded-xl" />
            </div>
          ) : overview ? (
            <div className="space-y-6">
              <Card className="p-4 sm:p-5">
                <div className="grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-2">
                    <Label>{tOverview("filters.label")}</Label>
                    <DateRangePicker value={pendingSel} onChange={setPendingSel} />
                    <p className="text-xs text-muted">{tOverview("filters.hint")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Badge tone="neutral">
                      {tOverview("filters.periodBadge", {
                        start: formatDate(overviewParsed.start),
                        end: formatDate(overviewParsed.end),
                      })}
                    </Badge>
                    <Button onClick={() => setAppliedSel(pendingSel)} type="button">
                      {tOverview("filters.apply")}
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label={tPage("stats.totalProposals")}
                  value={formatNumber(totalProposals)}
                  hint={tPage("stats.totalHint")}
                />
                <StatCard
                  label={tPage("stats.accepted")}
                  value={formatPercent(conversionRate)}
                  hint={tPage("stats.acceptedHint")}
                />
                <StatCard
                  label={tPage("stats.pipeline")}
                  value={formatCurrency(totalPipelineValue)}
                  hint={tPage("stats.pipelineHint", { avg: formatCurrency(pipelineAverageValue) })}
                />
              </div>

              {kpis ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label={tOverview("kpis.revenue.label")}
                    value={formatCurrency(Number(kpis.receitaAceita ?? 0))}
                    hint={tOverview("kpis.revenue.hint")}
                  />
                  <StatCard
                    label={tOverview("kpis.conversion.label")}
                    value={`${formatNumber(Number(kpis.taxaConversao ?? 0), { maximumFractionDigits: 2 })}%`}
                    hint={tOverview("kpis.conversion.hint")}
                  />
                  <StatCard
                    label={tOverview("kpis.ticket.label")}
                    value={formatCurrency(Number(kpis.ticketMedioAceitas ?? 0))}
                  />
                  <StatCard
                    label={tOverview("kpis.aging.label")}
                    value={formatNumber(Number(kpis.propostasAbertas14dMais ?? 0))}
                    hint={tOverview("kpis.aging.hint")}
                  />
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <Card className="p-5">
                  <CardHeader>
                    <div>
                      <CardTitle>{tPage("quickActions.title")}</CardTitle>
                      <CardDescription>{tPage("quickActions.description")}</CardDescription>
                    </div>
                  </CardHeader>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => setActiveTab("custom")}>
                      <ChartLine size={16} />
                      {tPage("quickActions.generate")}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActiveTab("custom");
                        setVisualization("bar");
                        setQuery(suggestions[0] ?? "");
                      }}
                    >
                      {tPage("quickActions.useSuggestion")}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPendingSel(undefined);
                        setAppliedSel(undefined);
                        overviewQuery.refetch();
                      }}
                    >
                      <ArrowClockwise size={16} />
                      {tPage("quickActions.refresh")}
                    </Button>
                  </div>
                </Card>

                <Card className="p-5">
                  <CardTitle>{tPage("highlights.title")}</CardTitle>
                  <div className="mt-4 space-y-4">
                    {topPerformer ? (
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
                          <Trophy size={18} weight="bold" />
                        </span>
                        <div className="min-w-0">
                          <p className="meta-label">{tPage("highlights.topPerformer")}</p>
                          <p className="truncate text-sm font-semibold text-ink">
                            {topPerformer.name ?? tPage("highlights.unknown")}
                          </p>
                          <p className="text-xs text-muted">
                            {tPage("highlights.totalSent", {
                              value: formatNumber(Number(topPerformer.total ?? 0)),
                            })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">{tPage("highlights.noPerformer")}</p>
                    )}
                    <div className="space-y-1.5">
                      <p className="meta-label">{tPage("highlights.upcoming")}</p>
                      {upcomingHighlights.length > 0 ? (
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {upcomingHighlights.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                              <span className="truncate text-ink">{item.client ?? tPage("highlights.noClient")}</span>
                              <span className="tabular shrink-0 text-xs text-muted">{formatDate(item.createdAt)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted">{tPage("highlights.noUpcoming")}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <CardHeader>
                    <CardTitle>{tOverview("status.title")}</CardTitle>
                    <Badge tone="neutral">
                      {tOverview("status.badge", { count: formatNumber(totalProposals) })}
                    </Badge>
                  </CardHeader>
                  {statusChartData.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {statusChartData.map((s) => (
                          <li key={s.name} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                            <span aria-hidden style={{ background: s.color }} className="h-2.5 w-2.5 rounded-sm" />
                            {s.name}
                            <span className="tabular text-muted">({s.value})</span>
                          </li>
                        ))}
                      </ul>
                      <BarChartViz
                        data={statusChartData}
                        valueFormatter={(value) => formatNumber(Number(value))}
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">{tOverview("status.empty")}</p>
                  )}
                </Card>

                <Card className="p-5">
                  <CardHeader>
                    <CardTitle>{tOverview("topClients.title")}</CardTitle>
                    {topClientsTotal > 0 ? (
                      <Badge tone="neutral">
                        {tOverview("topClients.total", {
                          value: formatCurrency(topClientsTotal),
                        })}
                      </Badge>
                    ) : null}
                  </CardHeader>
                  {topClientsChartData.length > 0 ? (
                    <div className="mt-4">
                      <BarChartViz
                        data={topClientsChartData}
                        valueFormatter={(value) => formatCurrency(Number(value))}
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">{tOverview("topClients.empty")}</p>
                  )}
                </Card>
              </div>

              <Card className="p-5">
                <CardHeader>
                  <CardTitle>{tOverview("team.title")}</CardTitle>
                </CardHeader>
                {teamChartData.length > 0 ? (
                  <TeamBarChart data={teamChartData} height={320} className="mt-2" />
                ) : (
                  <p className="mt-4 text-sm text-muted">{tOverview("team.empty")}</p>
                )}
              </Card>

              {receitaCidadeChartData.length > 0 ? (
                <Card className="p-5">
                  <CardHeader>
                    <CardTitle>{tOverview("cityRevenue.title")}</CardTitle>
                  </CardHeader>
                  <div className="mt-4">
                    <BarChartViz
                      data={receitaCidadeChartData}
                      valueFormatter={(v) => formatCurrency(Number(v))}
                    />
                  </div>
                </Card>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <CardHeader>
                    <CardTitle>{tOverview("pipelineSummary.title")}</CardTitle>
                    <Badge tone="neutral">
                      {tOverview("pipelineSummary.badge", {
                        leads: formatNumber(totalPipelineLeads),
                        value: formatCurrency(totalPipelineValue),
                      })}
                    </Badge>
                  </CardHeader>
                  <div className="mt-4">
                    {pipelineTableRows.length > 0 ? (
                      <SimpleTable
                        columns={[
                          tOverview("pipelineSummary.columns.stage"),
                          tOverview("pipelineSummary.columns.leads"),
                          tOverview("pipelineSummary.columns.value"),
                        ]}
                        rows={pipelineTableRows}
                        formatNumber={formatNumber}
                      />
                    ) : (
                      <p className="text-sm text-muted">{tOverview("pipelineSummary.empty")}</p>
                    )}
                  </div>
                </Card>

                <Card className="p-5">
                  <CardHeader>
                    <CardTitle>{tOverview("pipelineDistribution.title")}</CardTitle>
                  </CardHeader>
                  <div className="mt-4">
                    {pipelineChartData.length > 0 ? (
                      <FunnelChartViz
                        data={pipelineChartData}
                        valueFormatter={(value) =>
                          tOverview("pipelineDistribution.formatLead", {
                            value: formatNumber(Number(value)),
                          })
                        }
                      />
                    ) : (
                      <p className="text-sm text-muted">{tOverview("pipelineDistribution.empty")}</p>
                    )}
                  </div>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <CardHeader className="px-5 py-4">
                  <CardTitle>{tOverview("recentProposals.title")}</CardTitle>
                  <span className="text-xs text-muted">
                    {tOverview("recentProposals.badge", {
                      start: recentRangeStart,
                      end: recentRangeEnd,
                    })}
                  </span>
                </CardHeader>
                <div className="overflow-auto border-t border-border">
                  <table className="data-table min-w-[560px]">
                    <thead>
                      <tr>
                        <th>{tOverview("recentProposals.columns.title")}</th>
                        <th>{tOverview("recentProposals.columns.client")}</th>
                        <th>{tOverview("recentProposals.columns.status")}</th>
                        <th>{tOverview("recentProposals.columns.createdAt")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProposals.length > 0 ? (
                        recentProposals.map((item) => (
                          <tr key={item.id}>
                            <td className="font-semibold text-ink">
                              {item.title ?? tOverview("recentProposals.fallbacks.title")}
                            </td>
                            <td>{item.client ?? tOverview("recentProposals.fallbacks.client")}</td>
                            <td>
                              <Badge
                                dot
                                tone={statusBadges[item.status]?.tone ?? statusBadges.default.tone}
                              >
                                {statusBadges[item.status]?.label ?? statusBadges.default.label}
                              </Badge>
                            </td>
                            <td className="tabular whitespace-nowrap">{formatDate(item.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted">
                            {tOverview("recentProposals.fallbacks.empty")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            <EmptyState icon={<ChartLine size={24} weight="bold" />} title={tOverview("empty")} />
          )}
        </TabsContent>

        {/* ------------------------- GERADOR PERSONALIZADO ------------------------- */}
        <TabsContent value="custom">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="space-y-5 p-5 sm:p-6">
              <Field label={tCustom("intent.label")} htmlFor="report-intent" hint={tCustom("helper")}>
                <Textarea
                  id="report-intent"
                  placeholder={tCustom("intent.placeholder")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </Field>

              <div className="space-y-2">
                <Label>{tCustom("suggestions")}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-left text-[13px] font-medium transition-colors",
                        query === item
                          ? "border-primary bg-primary-tint text-ink"
                          : "border-border bg-white text-ink-muted hover:border-outline hover:text-ink",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                <Field label={tCustom("visualization")} htmlFor="report-visualization">
                  <Select
                    id="report-visualization"
                    value={visualization}
                    onValueChange={(value) => setVisualization(value as typeof visualization)}
                  >
                    <SelectItem value="table">{tCustom("visualizationOptions.table")}</SelectItem>
                    <SelectItem value="bar">{tCustom("visualizationOptions.bar")}</SelectItem>
                    <SelectItem value="line">{tCustom("visualizationOptions.line")}</SelectItem>
                  </Select>
                </Field>
                <div className="space-y-2">
                  <Label>{tCustom("dateRange")}</Label>
                  <DateRangePicker value={customSel} onChange={setCustomSel} />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-5">
                <Button variant="ghost" onClick={handleClear}>
                  {tCustom("clear")}
                </Button>
                <Button onClick={handleGenerate} loading={isLoading} loadingText={tCustom("generating")}>
                  {visualization === "table" ? <TableIcon size={16} /> : <ChartLine size={16} />}
                  {tCustom("generate")}
                </Button>
              </div>
            </Card>

            <Card className="min-h-[320px] p-5 sm:p-6">
              {error ? (
                <Notice tone="danger">{error}</Notice>
              ) : report ? (
                Array.isArray(report.result) ? (
                  (() => {
                    const arr = report.result as Record<string, unknown>[];
                    // If the generator already returned a name/value series, render a bar chart
                    const looksLikeSeries =
                      arr.length > 0 &&
                      typeof arr[0].name === "string" &&
                      (typeof arr[0].value === "number" || !Number.isNaN(Number(arr[0].value)));
                    if (report.visualization === "bar" && looksLikeSeries) {
                      const barData = arr.map((r) => ({
                        name: String(r.name ?? "—"),
                        value: Number(r.value ?? 0),
                      }));
                      return (
                        <div className="space-y-3">
                          <CardTitle>{tCustomResult("title")}</CardTitle>
                          <BarChartViz
                            data={barData}
                            valueFormatter={(v) => v.toLocaleString("pt-BR")}
                          />
                        </div>
                      );
                    }

                    // Fallback to table
                    return (
                      <div className="space-y-3">
                        <CardTitle>{tCustomResult("title")}</CardTitle>
                        <div className="overflow-auto rounded-lg border border-border">
                          <table className="data-table data-table--compact min-w-[360px]">
                            <thead>
                              <tr>
                                {Object.keys(arr[0] ?? {}).map((key) => (
                                  <th key={key}>{key}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {arr.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {Object.values(row).map((value, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className={typeof value === "number" ? "tabular text-ink" : "text-ink"}
                                    >
                                      {typeof value === "number"
                                        ? value.toLocaleString("pt-BR")
                                        : String(value ?? "—")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-3">
                    <CardTitle>{tCustomResult("rawTitle")}</CardTitle>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-surface-muted p-4 text-xs text-ink-muted">
                      {JSON.stringify(report.result, null, 2)}
                    </pre>
                  </div>
                )
              ) : (
                <EmptyState
                  className="h-full border-none py-10"
                  icon={<ChartLine size={24} weight="bold" />}
                  title={tCustomResult("waitingTitle")}
                  description={tCustomResult("placeholder")}
                />
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
