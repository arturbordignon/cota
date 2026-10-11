"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import React, { memo, useCallback, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ChartLine, Table as TableIcon } from "@phosphor-icons/react";
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
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
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

const TONE_COLORS: Record<"neutral" | "info" | "warning" | "success" | "danger", string> = {
  neutral: "var(--color-outline)",
  info: "var(--color-primary)",
  warning: "var(--color-warning)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
};

// Palette for generic series
const CATEGORICAL_COLORS = [
  "var(--color-info)",
  "hsl(20 90% 54%)",
  "hsl(158 64% 45%)",
  "hsl(262 83% 58%)",
  "hsl(192 91% 36%)",
  "hsl(340 82% 52%)",
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
  const defaultFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    [],
  );
  const formatter = valueFormatter ?? ((value: number) => defaultFormatter.format(value));
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
            <LabelList position="top" formatter={(value) => formatter(Number(value))} />
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
  const defaultFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    [],
  );
  const formatter = valueFormatter ?? ((value: number) => defaultFormatter.format(value));
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
              formatter={(value) => formatter(Number(value))}
              fill="var(--color-muted)"
            />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
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
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          {tPage("alerts.missingToken")}
        </Card>
      ) : null}

      {overviewError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {tPage("alerts.loadError", { error: overviewError.message })}
        </Card>
      ) : null}

      <PageHeader title={tPage("header.title")} description={tPage("header.description")} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "overview" | "custom")}
        className="space-y-4"
      >
        <TabsList className="flex w-full flex-wrap gap-2">
          <TabsTrigger value="overview">{tPage("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="custom">{tPage("tabs.custom")}</TabsTrigger>
        </TabsList>

        {/* ------------------------- VISÃO GERAL ------------------------- */}
        <TabsContent value="overview">
          {overviewQuery.isLoading ? (
            <Card className="p-6 text-sm text-muted">{tOverview("loading")}</Card>
          ) : overview ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label={tPage("stats.totalProposals")}
                  value={
                    <span className="inline-flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-ink">
                        {formatNumber(totalProposals)}
                      </span>
                    </span>
                  }
                  hint={tPage("stats.totalHint")}
                />
                <StatCard
                  label={tPage("stats.accepted")}
                  value={
                    <span className="text-3xl font-extrabold text-success">
                      {formatPercent(conversionRate)}
                    </span>
                  }
                  hint={tPage("stats.acceptedHint")}
                />
                <StatCard
                  label={tPage("stats.pipeline")}
                  value={
                    <span className="text-3xl font-extrabold text-success">
                      {formatCurrency(totalPipelineValue)}
                    </span>
                  }
                  hint={tPage("stats.pipelineHint", { avg: formatCurrency(pipelineAverageValue) })}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <Card className="space-y-4 border border-outline/0 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 px-6 py-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-ink">
                        {tPage("quickActions.title")}
                      </h3>
                      <p className="text-sm text-muted">{tPage("quickActions.description")}</p>
                    </div>
                    <Badge tone="info">{tPage("quickActions.badge")}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Button
                      variant="primary"
                      className="justify-start gap-2 shadow"
                      onClick={() => setActiveTab("custom")}
                    >
                      <ChartLine size={16} />
                      {tPage("quickActions.generate")}
                    </Button>
                    <Button
                      variant="secondary"
                      className="justify-start gap-2 shadow-sm"
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
                      className="justify-start gap-2"
                      onClick={() => {
                        setPendingSel(undefined);
                        setAppliedSel(undefined);
                        overviewQuery.refetch();
                      }}
                    >
                      {tPage("quickActions.refresh")}
                    </Button>
                  </div>
                </Card>

                <Card className="space-y-4 border border-outline/40 bg-white px-6 py-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-ink">
                      {tPage("highlights.title")}
                    </h3>
                    <Badge tone="neutral">{tPage("highlights.badge")}</Badge>
                  </div>
                  {topPerformer ? (
                    <div className="rounded-xl border border-outline/30 bg-[var(--color-surface-muted)]/60 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {tPage("highlights.topPerformer")}
                      </p>
                      <p className="text-sm font-semibold text-ink">
                        {topPerformer.name ?? tPage("highlights.unknown")}
                      </p>
                      <p className="text-xs text-muted">
                        {tPage("highlights.totalSent", {
                          value: formatNumber(Number(topPerformer.total ?? 0)),
                        })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">{tPage("highlights.noPerformer")}</p>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {tPage("highlights.upcoming")}
                    </p>
                    {upcomingHighlights.length > 0 ? (
                      upcomingHighlights.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg bg-[var(--color-surface-muted)]/50 px-3 py-2 text-sm"
                        >
                          <span className="text-ink">
                            {item.client ?? tPage("highlights.noClient")}
                          </span>
                          <span className="text-muted">{formatDate(item.createdAt)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted">{tPage("highlights.noUpcoming")}</p>
                    )}
                  </div>
                </Card>
              </div>
              {/* Range selector with Apply */}
              <Card className="p-4">
                <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5">
                    <Label>{tOverview("filters.label")}</Label>
                    <DateRangePicker value={pendingSel} onChange={setPendingSel} />
                    <p className="text-[11px] text-muted">{tOverview("filters.hint")}</p>
                  </div>
                  <div className="flex gap-2 justify-self-start sm:justify-self-end">
                    <Badge tone="info" className="self-center">
                      {tOverview("filters.periodBadge", {
                        start: formatDate(overviewParsed.start),
                        end: formatDate(overviewParsed.end),
                      })}
                    </Badge>
                    <Button size="sm" onClick={() => setAppliedSel(pendingSel)} type="button">
                      {tOverview("filters.apply")}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* KPIs (optional) */}
              {kpis ? (
                <div className="grid gap-4 lg:grid-cols-4">
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

              {/* Status + Receita por cliente */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">{tOverview("status.title")}</h3>
                    <Badge tone="neutral">
                      {tOverview("status.badge", { count: formatNumber(totalProposals) })}
                    </Badge>
                  </div>
                  {statusChartData.length > 0 ? (
                    <>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {statusChartData.map((s) => (
                          <div key={s.name} className="inline-flex items-center gap-2 text-xs">
                            <span
                              aria-hidden
                              style={{ background: s.color }}
                              className="inline-block h-3 w-3 rounded-sm"
                            />
                            <span className="text-muted">
                              {s.name} <span className="text-[11px] text-muted">({s.value})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                      <BarChartViz
                        data={statusChartData}
                        valueFormatter={(value) => formatNumber(Number(value))}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-muted">{tOverview("status.empty")}</p>
                  )}
                </Card>

                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">
                      {tOverview("topClients.title")}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge tone="info">{tOverview("topClients.badge")}</Badge>
                      {topClientsTotal > 0 ? (
                        <Badge tone="neutral">
                          {tOverview("topClients.total", {
                            value: formatCurrency(topClientsTotal),
                          })}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {topClientsChartData.length > 0 ? (
                    <BarChartViz
                      data={topClientsChartData}
                      valueFormatter={(value) => formatCurrency(Number(value))}
                    />
                  ) : (
                    <p className="text-xs text-muted">{tOverview("topClients.empty")}</p>
                  )}
                </Card>
              </div>

              {/* Propostas por consultor */}
              <Card className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">{tOverview("team.title")}</h3>
                  <Badge tone="neutral">{tOverview("team.badge")}</Badge>
                </div>
                {teamChartData.length > 0 ? (
                  <TeamBarChart data={teamChartData} height={320} />
                ) : (
                  <p className="text-xs text-muted">{tOverview("team.empty")}</p>
                )}
              </Card>

              {/* Receita por cidade (opcional) */}
              {receitaCidadeChartData.length > 0 ? (
                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">
                      {tOverview("cityRevenue.title")}
                    </h3>
                    <Badge tone="info">{tOverview("cityRevenue.badge")}</Badge>
                  </div>
                  <BarChartViz
                    data={receitaCidadeChartData}
                    valueFormatter={(v) => formatCurrency(Number(v))}
                  />
                </Card>
              ) : null}

              {/* Pipeline resumo + funil */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">
                      {tOverview("pipelineSummary.title")}
                    </h3>
                    <Badge tone="info">
                      {tOverview("pipelineSummary.badge", {
                        leads: formatNumber(totalPipelineLeads),
                        value: formatCurrency(totalPipelineValue),
                      })}
                    </Badge>
                  </div>
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
                    <p className="text-xs text-muted">{tOverview("pipelineSummary.empty")}</p>
                  )}
                </Card>

                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">
                      {tOverview("pipelineDistribution.title")}
                    </h3>
                    <Badge tone="neutral">{tOverview("pipelineDistribution.badge")}</Badge>
                  </div>
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
                    <p className="text-xs text-muted">{tOverview("pipelineDistribution.empty")}</p>
                  )}
                </Card>
              </div>

              {/* Propostas recentes */}
              <Card className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">
                    {tOverview("recentProposals.title")}
                  </h3>
                  <Badge tone="neutral">
                    {tOverview("recentProposals.badge", {
                      start: recentRangeStart,
                      end: recentRangeEnd,
                    })}
                  </Badge>
                </div>
                <div className="overflow-auto rounded-lg border border-outline/40">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">
                          {tOverview("recentProposals.columns.title")}
                        </th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">
                          {tOverview("recentProposals.columns.client")}
                        </th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">
                          {tOverview("recentProposals.columns.status")}
                        </th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">
                          {tOverview("recentProposals.columns.createdAt")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProposals.length > 0 ? (
                        recentProposals.map((item) => (
                          <tr key={item.id} className="even:bg-[var(--color-surface-muted)]/30">
                            <td className="px-4 py-2 text-ink">
                              {item.title ?? tOverview("recentProposals.fallbacks.title")}
                            </td>
                            <td className="px-4 py-2 text-ink">
                              {item.client ?? tOverview("recentProposals.fallbacks.client")}
                            </td>
                            <td className="px-4 py-2 text-ink">
                              <Badge
                                tone={statusBadges[item.status]?.tone ?? statusBadges.default.tone}
                              >
                                {statusBadges[item.status]?.label ?? statusBadges.default.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-ink">{formatDate(item.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-muted">
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
            <Card className="p-6 text-sm text-muted">{tOverview("empty")}</Card>
          )}
        </TabsContent>

        {/* ------------------------- GERADOR PERSONALIZADO ------------------------- */}
        <TabsContent value="custom">
          <div className="space-y-4">
            <Card className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="report-intent">{tCustom("intent.label")}</Label>
                <Textarea
                  id="report-intent"
                  placeholder={tCustom("intent.placeholder")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <p className="text-xs text-muted">{tCustom("helper")}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{tCustom("visualization")}</Label>
                  <Select
                    value={visualization}
                    onValueChange={(value) => setVisualization(value as typeof visualization)}
                  >
                    <SelectItem value="table">{tCustom("visualizationOptions.table")}</SelectItem>
                    <SelectItem value="bar">{tCustom("visualizationOptions.bar")}</SelectItem>
                    <SelectItem value="line">{tCustom("visualizationOptions.line")}</SelectItem>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tCustom("dateRange")}</Label>
                  <DateRangePicker value={customSel} onChange={setCustomSel} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tCustom("suggestions")}</Label>
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
                    {tCustom("clear")}
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    loading={isLoading}
                    loadingText={
                      <span className="inline-flex items-center gap-2">
                        {visualization === "table" ? (
                          <TableIcon size={16} className="mr-1" />
                        ) : (
                          <ChartLine size={16} className="mr-1" />
                        )}
                        {tCustom("generating")}
                      </span>
                    }
                  >
                    {visualization === "table" ? (
                      <TableIcon size={16} className="mr-2" />
                    ) : (
                      <ChartLine size={16} className="mr-2" />
                    )}
                    {tCustom("generate")}
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
                            <p className="text-sm font-semibold text-ink">
                              {tCustomResult("title")}
                            </p>
                            <BarChartViz
                              data={barData}
                              valueFormatter={(v) => v.toLocaleString("pt-BR")}
                            />
                          </div>
                        );
                      }

                      // Fallback to table
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-ink">{tCustomResult("title")}</p>
                          <div className="overflow-auto rounded-lg border border-outline/40">
                            <table className="w-full min-w-[360px] text-left text-xs">
                              <thead className="bg-[var(--color-surface-muted)]/50 text-muted">
                                <tr>
                                  {Object.keys(arr[0] ?? {}).map((key) => (
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
                                {arr.map((row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className="even:bg-[var(--color-surface-muted)]/30"
                                  >
                                    {Object.values(row).map((value, cellIndex) => (
                                      <td key={cellIndex} className="px-4 py-2 text-ink">
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
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink">{tCustomResult("rawTitle")}</p>
                      <pre className="max-h-60 overflow-auto rounded-lg bg-[var(--color-surface-muted)]/60 p-4 text-xs text-muted">
                        {JSON.stringify(report.result, null, 2)}
                      </pre>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-ink">
                      {tCustomResult("waitingTitle")}
                    </p>
                    <p>{tCustomResult("placeholder")}</p>
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
