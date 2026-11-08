'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import type { BillingOverviewResponse } from '@/types/api';

export function PlanUsageSnapshot() {
  const api = useApi();
  const t = useTranslations('billing.usage');
  const format = useFormatter();
  const overviewQuery = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: () => api.get<BillingOverviewResponse>('/billing/overview'),
    enabled: api.isAuthenticated,
  });

  if (overviewQuery.isError) {
    return <Notice tone="danger">{t('loadError')}</Notice>;
  }

  if (!overviewQuery.data) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  const { plan, usage } = overviewQuery.data.data;
  const remaining = usage.total ? Math.max(usage.total - usage.used, 0) : null;
  const progress = usage.total ? Math.min((usage.used / usage.total) * 100, 100) : 0;

  return (
    <Card className="p-5">
      <p className="meta-label">{t('currentPlan')}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold text-ink">{plan ? plan.name : t('basicPlan')}</p>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">{t('used')}</p>
        <p className="tabular text-sm font-bold text-ink">
          {usage.used}
          {usage.total ? ` / ${usage.total}` : ''}
        </p>
      </div>

      {usage.total ? (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={progress >= 90 ? 'h-full rounded-full bg-danger' : 'h-full rounded-full bg-primary'}
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {remaining !== null ? (
        <p className="mt-2 text-xs text-muted">
          {t('remaining', {
            count: remaining,
            date: format.dateTime(new Date(usage.periodEnd), { day: '2-digit', month: '2-digit', year: 'numeric' }),
          })}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">{t('unlimited')}</p>
      )}
    </Card>
  );
}
