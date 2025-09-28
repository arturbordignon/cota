'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApi } from '@/hooks/use-api';
import {
  BillingOverviewResponse,
  ProposalSummary,
  ProposalStatus,
  ProposalsResponse,
} from '@/types/api';

interface DashboardMetric {
  key: 'sent' | 'conversion' | 'time';
  label: string;
  value: string;
  delta: string;
}

const SENT_STATUSES: ProposalStatus[] = ['SENT', 'ACCEPTED', 'DECLINED'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function previousMonth(date: Date) {
  const prev = new Date(date);
  prev.setMonth(prev.getMonth() - 1);
  return prev;
}

function isBetween(date: string | null | undefined, start: Date, end: Date) {
  if (!date) return false;
  const value = new Date(date);
  return value >= start && value <= end;
}

function minutesBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return diff > 0 ? diff / 60000 : null;
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tActions = useTranslations('actions');
  const format = useFormatter();
  const api = useApi();

  const proposalsQuery = useQuery({
    queryKey: ['proposals', 'dashboard'],
    queryFn: () => api.get<ProposalsResponse>('/proposals'),
    enabled: Boolean(api.token),
  });

  const billingQuery = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: () => api.get<BillingOverviewResponse>('/billing/overview'),
    enabled: Boolean(api.token),
  });

  const proposals = useMemo(
    () => ((proposalsQuery.data?.data ?? []) as ProposalSummary[]),
    [proposalsQuery.data]
  );
  const usage = billingQuery.data?.data.usage;
  const plan = billingQuery.data?.data.plan;
  const loadError = (proposalsQuery.error ?? billingQuery.error) as Error | null;

  const quickActions = useMemo(
    () => [
      {
        title: tActions('createProposal'),
        href: '/proposals/new',
        description: t('quickAccess.items.createProposal.description'),
        cta: t('quickAccess.items.createProposal.cta'),
      },
      {
        title: tActions('addClient'),
        href: '/clients/new',
        description: t('quickAccess.items.addClient.description'),
        cta: t('quickAccess.items.addClient.cta'),
      },
      {
        title: tActions('createTemplate'),
        href: '/templates/new',
        description: t('quickAccess.items.createTemplate.description'),
        cta: t('quickAccess.items.createTemplate.cta'),
      },
    ],
    [tActions, t]
  );

  const metrics = useMemo<DashboardMetric[]>(() => {
    const now = new Date();
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = startOfMonth(previousMonth(now));

    const currentProposals = proposals.filter((proposal) =>
      isBetween(proposal.createdAt, currentStart, currentEnd)
    );
    const previousProposals = proposals.filter((proposal) =>
      isBetween(proposal.createdAt, prevStart, prevEnd)
    );

    const currentSent = currentProposals.filter((proposal) =>
      SENT_STATUSES.includes(proposal.status)
    );
    const previousSent = previousProposals.filter((proposal) =>
      SENT_STATUSES.includes(proposal.status)
    );

    const sentCount = currentSent.length;
    const prevSentCount = previousSent.length;
    const sentDelta = prevSentCount === 0 ? null : ((sentCount - prevSentCount) / prevSentCount) * 100;

    const currentAccepted = currentProposals.filter((proposal) => proposal.status === 'ACCEPTED');
    const previousAccepted = previousProposals.filter((proposal) => proposal.status === 'ACCEPTED');

    const acceptanceRate = sentCount > 0 ? (currentAccepted.length / sentCount) * 100 : 0;
    const prevAcceptanceRate = prevSentCount > 0 ? (previousAccepted.length / prevSentCount) * 100 : null;
    const acceptanceDelta =
      prevAcceptanceRate == null ? null : acceptanceRate - prevAcceptanceRate;

    const currentDurations = currentProposals
      .map((proposal) => {
        const endTimestamp = proposal.acceptedAt ?? proposal.declinedAt ?? proposal.sentAt;
        return endTimestamp ? minutesBetween(proposal.createdAt, endTimestamp) : null;
      })
      .filter((value): value is number => value != null);

    const previousDurations = previousProposals
      .map((proposal) => {
        const endTimestamp = proposal.acceptedAt ?? proposal.declinedAt ?? proposal.sentAt;
        return endTimestamp ? minutesBetween(proposal.createdAt, endTimestamp) : null;
      })
      .filter((value): value is number => value != null);

    const averageMinutes =
      currentDurations.length > 0
        ? currentDurations.reduce((acc, value) => acc + value, 0) / currentDurations.length
        : null;

    const previousAverageMinutes =
      previousDurations.length > 0
        ? previousDurations.reduce((acc, value) => acc + value, 0) / previousDurations.length
        : null;

    const timeDelta =
      averageMinutes == null || previousAverageMinutes == null
        ? null
        : averageMinutes - previousAverageMinutes;

    const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
      format.number(value, { maximumFractionDigits: 1, ...options });

    const formatSigned = (value: number, unit?: string) => {
      const sign = value > 0 ? '+' : value < 0 ? '-' : '';
      const formatted = formatNumber(Math.abs(value));
      const suffix = unit ? `${unit}` : '';
      return `${sign}${formatted}${suffix}`;
    };

    const metricsList: DashboardMetric[] = [
      {
        key: 'sent',
        label: t('metrics.sent.label'),
        value: formatNumber(sentCount, { maximumFractionDigits: 0 }),
        delta:
          sentDelta == null
            ? t('metrics.deltaUnavailable')
            : t('metrics.sent.delta', { value: formatSigned(sentDelta, '%') }),
      },
      {
        key: 'conversion',
        label: t('metrics.conversion.label'),
        value: `${formatNumber(acceptanceRate)}%`,
        delta:
          acceptanceDelta == null
            ? t('metrics.deltaUnavailable')
            : t('metrics.conversion.delta', { value: formatSigned(acceptanceDelta, '%') }),
      },
      {
        key: 'time',
        label: t('metrics.time.label'),
        value:
          averageMinutes == null
            ? t('metrics.noData')
            : `${formatNumber(averageMinutes, { maximumFractionDigits: 0 })} ${t('metrics.time.unit')}`,
        delta:
          timeDelta == null
            ? t('metrics.deltaUnavailable')
            : t('metrics.time.delta', {
                value: formatSigned(timeDelta, ` ${t('metrics.time.unit')}`),
              }),
      },
    ];

    return metricsList;
  }, [format, proposals, t]);

  const creditsLabel = t('credits.label');

  const creditsValue = useMemo(() => {
    if (!usage) {
      return t('credits.unavailable');
    }

    if (plan?.isUnlimited || plan?.proposalsPerMonth == null || usage.total == null) {
      return t('credits.unlimited');
    }

    const remaining = Math.max(usage.total - usage.used, 0);
    return format.number(remaining, { maximumFractionDigits: 0 });
  }, [format, plan, t, usage]);

  const isTokenMissing = !api.token;

  return (
    <section className="space-y-10">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          {t('warnings.tokenMissing')}
        </Card>
      ) : null}

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t('states.error')} {loadError.message}
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card
            key={metric.key}
            className="rounded-3xl border border-outline/50 bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-muted">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">
              {proposalsQuery.isLoading ? '...' : metric.value}
            </p>
            <p className="text-xs text-success">
              {proposalsQuery.isLoading ? '—' : metric.delta}
            </p>
          </Card>
        ))}
      </div>

      <PageHeader title={t('title')} description={t('description')} />

      <Card className="flex flex-col gap-6 rounded-3xl border-none bg-gradient-to-br from-primary-soft to-white px-6 py-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted">{creditsLabel}</p>
          <p className="font-display text-4xl font-semibold text-ink">
            {billingQuery.isLoading ? '...' : creditsValue}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/plans">{t('ctaButtons.buyCredits')}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/plans">{t('ctaButtons.upgradePlan')}</Link>
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-ink">{t('quickAccess.title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((item) => (
            <Card
              key={item.href}
              className="group flex flex-col justify-between gap-3 rounded-2xl border border-outline/60 bg-white px-6 py-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div>
                <div className="text-base font-semibold text-ink">{item.title}</div>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </div>
              <Link
                className="inline-flex items-center text-sm font-medium text-primary transition-colors group-hover:text-ink"
                href={item.href}
              >
                {item.cta}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
