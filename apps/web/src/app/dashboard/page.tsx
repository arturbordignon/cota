'use client';

import type { Route } from 'next';
import { useMemo } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CaretRight, FilePlus, Files, UserPlus } from '@phosphor-icons/react';

import { PageHeader } from '@/components/layout/page-header';
import { useCurrentUser } from '@/components/providers/user-provider';
import { StatCard } from '@/components/reports/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
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

const quickActionIcons = {
  '/proposals/new': FilePlus,
  '/clients/new': UserPlus,
  '/templates/new': Files,
} as const;

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tActions = useTranslations('actions');
  const format = useFormatter();
  const api = useApi();
  const { temPermissao } = useCurrentUser();

  const proposalsQuery = useQuery({
    queryKey: ['proposals', 'dashboard'],
    queryFn: () => api.get<ProposalsResponse>('/proposals'),
    enabled: Boolean(api.token) && temPermissao('proposals', 'view'),
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

  const quickActions = useMemo<
    { title: string; href: keyof typeof quickActionIcons & Route; description: string; cta: string }[]
  >(
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

    const formatNumber = (value: number, options?: Exclude<Parameters<typeof format.number>[1], string>) =>
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
  const isUnlimited = plan?.isUnlimited || plan?.proposalsPerMonth == null || usage?.total == null;

  const creditsValue = useMemo(() => {
    if (!usage) {
      return t('credits.unavailable');
    }

    if (isUnlimited) {
      return t('credits.unlimited');
    }

    const remaining = Math.max((usage.total ?? 0) - usage.used, 0);
    return format.number(remaining, { maximumFractionDigits: 0 });
  }, [format, isUnlimited, t, usage]);

  const usagePercent =
    usage && usage.total ? Math.min(Math.round((usage.used / usage.total) * 100), 100) : null;

  const isTokenMissing = !api.token;

  return (
    <section className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />

      {isTokenMissing ? <Notice tone="warning">{t('warnings.tokenMissing')}</Notice> : null}

      {loadError && !isTokenMissing ? (
        <Notice tone="danger">
          {t('states.error')} {loadError.message}
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <StatCard
            key={metric.key}
            label={metric.label}
            value={proposalsQuery.isLoading ? '…' : metric.value}
            hint={proposalsQuery.isLoading ? undefined : metric.delta}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="font-sans text-[15px] font-semibold text-ink">{t('quickAccess.title')}</h2>
          <Card className="divide-y divide-border overflow-hidden">
            {quickActions.map((item) => {
              const Icon = quickActionIcons[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted/70"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong">
                    <Icon size={20} weight="bold" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">{item.description}</span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 text-[13px] font-semibold text-primary-strong sm:inline-flex">
                    {item.cta}
                    <CaretRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="font-sans text-[15px] font-semibold text-ink">{creditsLabel}</h2>
          <Card className="p-5">
            <p className="meta-label">{plan?.name ?? creditsLabel}</p>
            <p className="tabular mt-1 font-display text-[40px] font-semibold leading-none text-ink">
              {billingQuery.isLoading ? '…' : creditsValue}
            </p>
            {usagePercent != null ? (
              <div className="mt-4 space-y-1.5">
                <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className={usagePercent >= 90 ? 'h-full rounded-full bg-danger' : 'h-full rounded-full bg-primary'}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="tabular text-xs text-muted">
                  {usage?.used} / {usage?.total}
                </p>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/plans">{t('ctaButtons.buyCredits')}</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/plans">{t('ctaButtons.upgradePlan')}</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
