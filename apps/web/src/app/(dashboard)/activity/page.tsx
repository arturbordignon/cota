'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CaretRight, ClockCounterClockwise } from '@phosphor-icons/react';

import { useCurrentUser } from '@/components/providers/user-provider';
import { FilterBar } from '@/components/layout/filter-bar';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { AuditEventsResponse } from '@/types/api';

const categoryKeys = [
  'proposal',
  'department',
  'notifications',
  'billing',
  'user',
  'system',
] as const;
type ActivityCategory = (typeof categoryKeys)[number];

export default function ActivityPage() {
  const { isOwner } = useCurrentUser();
  const api = useApi();
  const t = useTranslations('activity');
  const tCategories = useTranslations('activity.categories');
  const format = useFormatter();
  const formatTimestamp = (timestamp: string) =>
    format.dateTime(new Date(timestamp), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  const auditEventsQuery = useQuery({
    queryKey: ['audit-events', categoryFilter, debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter);
      }
      if (debouncedQuery.trim().length > 0) {
        params.set('search', debouncedQuery.trim());
      }
      return api.get<AuditEventsResponse>(
        `/audit-events${params.size ? `?${params.toString()}` : ''}`,
      );
    },
    enabled: isOwner && Boolean(api.token),
  });

  const events = auditEventsQuery.data?.data ?? [];

  if (!isOwner) {
    return (
      <section className="space-y-6">
        <PageHeader title={t('restricted.title')} description={t('restricted.description')} />
        <Notice tone="neutral">{t('restricted.callout')}</Notice>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <FilterBar
        busca={query}
        placeholder={t('filters.searchPlaceholder')}
        aoBuscar={setQuery}
        opcoes={[
          { id: 'all', rotulo: t('filters.allModules') },
          ...categoryKeys.map((category) => ({ id: category, rotulo: tCategories(category) })),
        ]}
        opcaoAtiva={categoryFilter}
        aoEscolher={setCategoryFilter}
        aoLimpar={() => {
          setQuery('');
          setCategoryFilter('all');
        }}
        rotuloLimpar={t('filters.clear')}
      />

      {auditEventsQuery.error ? (
        <Notice tone="danger">
          {t('states.error')} {(auditEventsQuery.error as Error).message}
        </Notice>
      ) : null}

      {auditEventsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon={<ClockCounterClockwise size={24} weight="bold" />} title={t('states.empty')} />
      ) : (
        <Card className="divide-y divide-border">
          {events.map((log) => {
            const metadataText = JSON.stringify(log.metadata ?? {}, null, 2);
            return (
              <article key={log.id} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">
                      {tCategories(log.category as ActivityCategory | 'system')}
                    </Badge>
                    <span className="text-xs text-muted">{log.event}</span>
                  </div>
                  <p className="text-[15px] font-semibold leading-snug text-ink">
                    {log.summaryKey
                      ? t(`entries.${log.summaryKey}`, log.summaryParams ?? {})
                      : log.summary}
                  </p>
                  {log.metadata ? (
                    <details className="group pt-1">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-[13px] font-semibold text-primary-strong [&::-webkit-details-marker]:hidden">
                        <CaretRight size={12} weight="bold" className="transition-transform group-open:rotate-90" />
                        {t('card.labels.technicalDetails')}
                      </summary>
                      <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-ink-muted">
                        {metadataText}
                      </pre>
                    </details>
                  ) : null}
                </div>

                <dl className="grid content-start gap-3 text-sm sm:grid-cols-2 md:grid-cols-1">
                  <div>
                    <dt className="meta-label">{t('card.labels.responsible')}</dt>
                    <dd className="mt-0.5 font-medium text-ink">{log.actor}</dd>
                    {log.actorEmail ? <dd className="truncate text-xs text-muted">{log.actorEmail}</dd> : null}
                  </div>
                  <div>
                    <dt className="meta-label">{t('card.labels.when')}</dt>
                    <dd className="tabular mt-0.5 text-ink">{formatTimestamp(log.createdAt)}</dd>
                    {log.ipAddress ? (
                      <dd className="text-xs text-muted">
                        {t('card.labels.ip')}: {log.ipAddress}
                      </dd>
                    ) : null}
                    {log.userAgent ? (
                      <dd className="line-clamp-1 text-xs text-muted" title={log.userAgent}>
                        {t('card.labels.agent')}: {log.userAgent}
                      </dd>
                    ) : null}
                  </div>
                </dl>
              </article>
            );
          })}
        </Card>
      )}
    </section>
  );
}
