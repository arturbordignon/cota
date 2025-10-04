'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/card';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type OverviewResponse = {
  data: {
    plan: {
      slug: string;
      name: string;
      proposalsPerMonth: number | null;
      isUnlimited: boolean;
      currency: string;
    } | null;
    usage: {
      used: number;
      total: number | null;
      periodEnd: string;
      periodStart: string;
    };
  };
};

export function PlanUsageSnapshot() {
  const [data, setData] = useState<OverviewResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!API_BASE) {
      return;
    }

    let isMounted = true;

    fetch(`${API_BASE}/api/v1/billing/overview`, {
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Falha ao carregar uso do plano');
        }
        return response.json() as Promise<OverviewResponse>;
      })
      .then((json) => {
        if (isMounted) {
          setData(json.data);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setError('Não foi possível carregar o uso atual.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!API_BASE) {
    return (
      <Card className="rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm text-muted">
          Configure `NEXT_PUBLIC_API_URL` para visualizar o consumo do plano em tempo real.
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm text-muted">{error}</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm text-muted">Carregando informações de uso...</p>
      </Card>
    );
  }

  const { plan, usage } = data;
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
