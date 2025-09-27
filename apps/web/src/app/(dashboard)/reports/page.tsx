"use client";

import { useState } from "react";
import { ChartLine, FunnelSimple, Sparkle, Table } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const suggestions = [
  "Taxa de conversão no último mês",
  "Receita por cliente nos últimos 90 dias",
  "Propostas geradas por membro da equipe",
  "Tempo médio entre envio e aceite"
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
          dateRange: parseRange(dateRange)
        })
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
              {visualization === 'table' ? <Table size={16} className="mr-2" /> : <ChartLine size={16} className="mr-2" />} {isLoading ? 'Gerando...' : 'Gerar relatório'}
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
                <div className="overflow-auto rounded-lg border border-outline/60">
                  <table className="w-full min-w-[320px] text-left text-xs">
                    <thead className="bg-[var(--color-surface-muted)]/80 text-muted">
                      <tr>
                        {Object.keys(report.result[0] ?? {}).map((key) => (
                          <th key={key} className="px-3 py-2 uppercase">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.result.map((row: Record<string, unknown>, index: number) => (
                        <tr key={index} className="border-t border-outline/40">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 text-ink">{String(value)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : typeof report.result === 'object' && report.result !== null ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">Resumo</p>
                <ul className="space-y-1 text-sm text-muted">
                  {Object.entries(report.result as Record<string, unknown>).map(([key, value]) => (
                    <li key={key} className="flex justify-between">
                      <span className="font-semibold text-ink">{key}</span>
                      <span>{String(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>O relatório foi gerado, mas não há dados para exibir neste intervalo.</p>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <FunnelSimple size={28} className="text-primary" />
              <p>Peça um relatório para visualizar aqui os dados em gráfico ou tabela.</p>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
