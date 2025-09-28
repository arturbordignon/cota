"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { AuditEventsResponse } from "@/types/api";

const categoryKeys = ["proposal", "department", "notifications", "billing", "user", "system"] as const;
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
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [debouncedQuery, setDebouncedQuery] = useState("");

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
      return api.get<AuditEventsResponse>(`/audit-events${params.size ? `?${params.toString()}` : ''}`);
    },
    enabled: isOwner && Boolean(api.token),
  });

  const events = auditEventsQuery.data?.data ?? [];

  if (!isOwner) {
    return (
      <section className="space-y-6">
        <PageHeader title={t('restricted.title')} description={t('restricted.description')} />
        <Card className="border border-outline/30 bg-white px-6 py-4 text-sm text-muted">
          <p>{t('restricted.callout')}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <Card className="flex flex-col gap-4 border border-outline/40 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-outline bg-white px-3 py-2">
          <MagnifyingGlass size={18} className="text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="h-9 flex-1 border-none bg-transparent px-0 text-sm focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectItem value="all">{t('filters.allModules')}</SelectItem>
            {categoryKeys.map((category) => (
              <SelectItem key={category} value={category}>
                {tCategories(category)}
              </SelectItem>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setCategoryFilter("all")}>
            <FunnelSimple size={16} />
            {t('filters.clear')}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {auditEventsQuery.isLoading ? (
          <Card className="border border-outline/30 bg-white px-6 py-8 text-center text-sm text-muted">
            Carregando eventos...
          </Card>
        ) : events.length === 0 ? (
          <Card className="border border-outline/30 bg-white px-6 py-8 text-center text-sm text-muted">
            {t('states.empty')}
          </Card>
        ) : null}
        {auditEventsQuery.error && !isTokenMissing ? (
          <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
            {t('states.error')} {(auditEventsQuery.error as Error).message}
          </Card>
        ) : null}
        {events.map((log) => {
          const metadataText = JSON.stringify(log.metadata ?? {}, null, 2);
          return (
          <Card key={log.id} className="space-y-3 border border-outline/60 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">
                  {log.summaryKey ? t(`entries.${log.summaryKey}`, log.summaryParams ?? {}) : log.summary}
                </p>
                <p className="text-xs text-muted">{log.event}</p>
              </div>
              <Badge tone="info">{tCategories(log.category as ActivityCategory | 'system')}</Badge>
            </div>

            <div className="grid gap-2 text-sm text-muted md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide">{t('card.labels.responsible')}</p>
                <p className="text-sm text-ink">{log.actor}</p>
                <p>{log.actorEmail}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide">{t('card.labels.when')}</p>
                <p>{formatTimestamp(log.createdAt)}</p>
                {log.ipAddress ? <p>{t('card.labels.ip')}: {log.ipAddress}</p> : null}
                {log.userAgent ? <p>{t('card.labels.agent')}: {log.userAgent}</p> : null}
              </div>
            </div>

            {log.metadata ? (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted">{t('card.labels.technicalDetails')}</p>
                <Textarea
                  value={metadataText}
                  readOnly
                  className="text-xs"
                  rows={Math.min(6, metadataText.split('\n').length + 1)}
                />
              </div>
            ) : null}
          </Card>
        );
        })}
      </div>
    </section>
  );
}
