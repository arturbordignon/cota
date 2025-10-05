"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Buildings, MagnifyingGlass, MapPin } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { ProspectsResponse } from "@/types/api";

const REGION_VALUES = ["", "Sudeste", "Sul", "Estados Unidos"] as const;
const REGION_KEYS: Record<(typeof REGION_VALUES)[number], string> = {
  "": "all",
  Sudeste: "southeast",
  Sul: "south",
  "Estados Unidos": "usa",
};

const SEGMENT_VALUES = ["", "Construção", "Logística", "Indústria", "Energia"] as const;
const SEGMENT_KEYS: Record<(typeof SEGMENT_VALUES)[number], string> = {
  "": "all",
  "Construção": "construction",
  "Logística": "logistics",
  "Indústria": "industry",
  "Energia": "energy",
};

const SOURCE_VALUES: Array<'internal' | 'external'> = ['internal', 'external'];

export default function ProspectsPage() {
  const t = useTranslations("prospects.page");
  const tCommon = useTranslations("common");
  const api = useApi();
  const [keywords, setKeywords] = useState("");
  const [debouncedKeywords, setDebouncedKeywords] = useState("");
  const [region, setRegion] = useState<(typeof REGION_VALUES)[number]>(REGION_VALUES[0]);
  const [segment, setSegment] = useState<(typeof SEGMENT_VALUES)[number]>(SEGMENT_VALUES[0]);
  const [source, setSource] = useState<'internal' | 'external'>('internal');

  const regionOptions = useMemo(
    () => REGION_VALUES.map((value) => ({ value, label: t(`filters.region.options.${REGION_KEYS[value]}`) })),
    [t],
  );

  const segmentOptions = useMemo(
    () => SEGMENT_VALUES.map((value) => ({ value, label: t(`filters.segment.options.${SEGMENT_KEYS[value]}`) })),
    [t],
  );

  const sourceOptions = useMemo(
    () => SOURCE_VALUES.map((value) => ({ value, label: t(`filters.source.options.${value}`) })),
    [t],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedKeywords(keywords.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [keywords]);

  const prospectsQuery = useQuery({
    queryKey: ['prospects', source, debouncedKeywords, region, segment],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedKeywords) params.set('search', debouncedKeywords);
      if (region) params.set('region', region);
      if (segment) params.set('segment', segment);
      if (source === 'external') {
        params.set('limit', '12');
        return api.get<ProspectsResponse>(`/prospects/suggest?${params.toString()}`);
      }
      return api.get<ProspectsResponse>(`/prospects${params.size ? `?${params.toString()}` : ''}`);
    },
    enabled:
      source === 'external'
        ? Boolean(api.token) && Boolean(debouncedKeywords)
        : Boolean(api.token),
  });

  const isExternalSource = source === 'external';
  const prospects = useMemo(() => {
    if (isExternalSource && !debouncedKeywords) return [];
    return prospectsQuery.data?.data ?? [];
  }, [prospectsQuery.data, isExternalSource, debouncedKeywords]);
  const isTokenMissing = !api.token;
  const loadError = prospectsQuery.isError ? (prospectsQuery.error as Error) : null;
  const isSearchDisabled = isExternalSource ? !debouncedKeywords || !api.token : !api.token;

  const segmentsFromData = useMemo(() => {
    const values = new Set<string>();
    prospects.forEach((prospect) => {
      if (prospect.segment) values.add(prospect.segment);
    });
    return Array.from(values).sort();
  }, [prospects]);

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          {t("alerts.missingToken")}
        </Card>
      ) : null}

      <PageHeader
        title={t("header.title")}
        description={t("header.description")}
      />

      <Card className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr,1.25fr]">
          <div className="space-y-2">
            <Label htmlFor="keywords">{t("filters.keywords.label")}</Label>
            <div className="flex items-center gap-2 rounded-lg border border-outline bg-white px-3 py-2">
              <MagnifyingGlass size={18} className="text-muted" />
              <Input
                id="keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder={t("filters.keywords.placeholder")}
                className="h-9 border-none bg-transparent px-0 focus:ring-0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("filters.region.label")}</Label>
            <Select value={region} onValueChange={(value) => setRegion(value as (typeof REGION_VALUES)[number])}>
              {regionOptions.map((option) => (
                <SelectItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("filters.segment.label")}</Label>
            <Select value={segment} onValueChange={(value) => setSegment(value as (typeof SEGMENT_VALUES)[number])}>
              {segmentOptions.concat(
                segmentsFromData
                  .filter((value) => !SEGMENT_VALUES.includes(value as (typeof SEGMENT_VALUES)[number]))
                  .map((value) => ({ value, label: value }))
              ).map((option) => (
                <SelectItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("filters.source.label")}</Label>
            <Select value={source} onValueChange={(value) => setSource(value as 'internal' | 'external')}>
              {sourceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {isExternalSource
              ? t("filters.helper.external")
              : t("filters.helper.internal")}
          </p>
          <Button
            variant="primary"
            onClick={() => prospectsQuery.refetch()}
            disabled={isSearchDisabled}
            loading={prospectsQuery.isFetching}
            loadingText={tCommon("loading.searching")}
          >
            {t("actions.search")}
          </Button>
        </div>
        {isExternalSource && !debouncedKeywords ? (
          <p className="rounded-lg border border-outline/40 bg-white px-4 py-2 text-xs text-warning">
            {t("filters.externalPrompt")}
          </p>
        ) : null}
      </Card>

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t("alerts.loadError", { message: loadError.message })}
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {isExternalSource && !debouncedKeywords ? (
          <Card className="col-span-full border border-outline/40 bg-warning-soft/30 px-6 py-10 text-center text-sm text-warning">
            {t("empty.externalPrompt")}
          </Card>
        ) : prospectsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={`prospect-skeleton-${index}`}
              className="h-40 animate-pulse rounded-3xl border border-outline/40 bg-white/70"
            />
          ))
        ) : prospects.length === 0 ? (
          <Card className="col-span-full border border-outline/40 bg-white px-6 py-10 text-center text-sm text-muted">
            {t("empty.list")}
          </Card>
        ) : (
          prospects.map((prospect) => (
            <Card
              key={prospect.id}
              className="flex flex-col gap-4 border border-outline/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-ink">{prospect.name}</h3>
                  {prospect.segment ? <Badge tone="info">{prospect.segment}</Badge> : null}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                  <MapPin size={16} weight="bold" />
                  {[prospect.city, prospect.state ?? prospect.region].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
              <div className="rounded-lg border border-outline/60 bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-ink">
                <Buildings size={16} className="mr-2 inline text-primary" />
                {prospect.opportunity ?? t("cards.noOpportunity")}
              </div>
              <div className="text-xs text-muted">
                {prospect.email ? <p>{t("cards.email", { value: prospect.email })}</p> : null}
                {prospect.phone ? <p>{t("cards.phone", { value: prospect.phone })}</p> : null}
              </div>
              <div className="mt-auto flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  {t("cards.view")}
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  {t("cards.addToCrm")}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
