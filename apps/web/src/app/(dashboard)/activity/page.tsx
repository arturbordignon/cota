"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { mockAuditLogs } from "@/data/mock/audit-events";

const categoryKeys = ["proposal", "department", "notifications", "billing", "user", "system"] as const;
type ActivityCategory = (typeof categoryKeys)[number];

function getCategory(event: string): ActivityCategory {
  if (event.startsWith("proposal.")) return "proposal";
  if (event.startsWith("department.")) return "department";
  if (event.startsWith("notifications.")) return "notifications";
  if (event.startsWith("billing.")) return "billing";
  if (event.startsWith("user.")) return "user";
  return "system";
}

export default function ActivityPage() {
  const { isOwner } = useCurrentUser();
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

  const filteredLogs = useMemo(() => {
    return mockAuditLogs.filter((entry) => {
      const category = getCategory(entry.event);
      const matchesCategory = categoryFilter === "all" || category === categoryFilter;
      const searchTarget = `${entry.actor} ${entry.actorEmail} ${entry.event} ${entry.summary}`.toLowerCase();
      const matchesQuery = searchTarget.includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, query]);

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
        {filteredLogs.length === 0 ? (
          <Card className="border border-outline/30 bg-white px-6 py-8 text-center text-sm text-muted">
            {t('states.empty')}
          </Card>
        ) : null}
        {filteredLogs.map((log) => (
          <Card key={log.id} className="space-y-3 border border-outline/60 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">
                  {log.summaryKey ? t(`entries.${log.summaryKey}`, log.summaryParams ?? {}) : log.summary}
                </p>
                <p className="text-xs text-muted">{log.event}</p>
              </div>
              <Badge tone="info">{tCategories(getCategory(log.event))}</Badge>
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
                  value={JSON.stringify(log.metadata, null, 2)}
                  readOnly
                  className="text-xs"
                  rows={Math.min(6, JSON.stringify(log.metadata, null, 2).split('\n').length + 1)}
                />
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
