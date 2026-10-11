'use client';

import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { useApi } from '@/hooks/use-api';
import type { BillingOverviewResponse } from '@/types/api';

export function PlanUsageSnapshot() {
  const api = useApi();
  const overviewQuery = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: () => api.get<BillingOverviewResponse>('/billing/overview'),
    enabled: api.isAuthenticated,
  });

  if (overviewQuery.isError) {
    return (
      <Card className="rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm text-muted">Não foi possível carregar o uso atual.</p>
      </Card>
    );
  }

  if (!overviewQuery.data) {
    return (
      <Card className="rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm text-muted">Carregando informações de uso...</p>
      </Card>
    );
  }

  const { plan, usage } = overviewQuery.data.data;
  const remaining = usage.total ? Math.max(usage.total - usage.used, 0) : null;
  const progress = usage.total ? Math.min((usage.used / usage.total) * 100, 100) : 0;

  return (
    <Card className="space-y-4 rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Plano atual</p>
          <p className="text-xl font-semibold text-ink">{plan ? plan.name : 'Plano básico'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted">Propostas geradas neste ciclo</p>
          <p className="text-xl font-semibold text-ink">
            {usage.used}
            {usage.total ? ` / ${usage.total}` : ''}
          </p>
          {remaining !== null ? (
            <p className="text-xs text-muted">
              Restam {remaining} propostas até {new Date(usage.periodEnd).toLocaleDateString()}
            </p>
          ) : (
            <p className="text-xs text-muted">Propostas ilimitadas</p>
          )}
        </div>
      </div>

      {usage.total ? (
        <div className="h-2 rounded-full bg-[var(--color-surface-muted)]">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </Card>
  );
}
