"use client";

import { useEffect, useMemo, useState } from "react";
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

const REGION_OPTIONS = [
  { value: "", label: "Brasil inteiro" },
  { value: "Sudeste", label: "Sudeste" },
  { value: "Sul", label: "Sul" },
  { value: "Estados Unidos", label: "Estados Unidos" },
];

const SEGMENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "Construção", label: "Construção" },
  { value: "Logística", label: "Logística" },
  { value: "Indústria", label: "Indústria pesada" },
  { value: "Energia", label: "Energia" },
];

const SOURCE_OPTIONS: Array<{ value: 'internal' | 'external'; label: string }> = [
  { value: 'internal', label: 'Meus prospects' },
  { value: 'external', label: 'Sugestões externas (Clearbit)' },
];

export default function ProspectsPage() {
  const api = useApi();
  const [keywords, setKeywords] = useState("");
  const [debouncedKeywords, setDebouncedKeywords] = useState("");
  const [region, setRegion] = useState(REGION_OPTIONS[0].value);
  const [segment, setSegment] = useState(SEGMENT_OPTIONS[0].value);
  const [source, setSource] = useState<'internal' | 'external'>('internal');

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
          Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para visualizar seus prospects reais.
        </Card>
      ) : null}

      <PageHeader
        title="Buscar prospects"
        description="Encontre empresas com potencial de contratação para guindastes, movimentação de carga e apoio a obras."
      />

      <Card className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr,1.25fr]">
          <div className="space-y-2">
            <Label htmlFor="keywords">Palavras-chave</Label>
            <div className="flex items-center gap-2 rounded-lg border border-outline bg-white px-3 py-2">
              <MagnifyingGlass size={18} className="text-muted" />
              <Input
                id="keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="Ex: terraplanagem, porto, guindaste telescópico"
                className="h-9 border-none bg-transparent px-0 focus:ring-0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado/Região</Label>
            <Select value={region} onValueChange={setRegion}>
              {REGION_OPTIONS.map((option) => (
                <SelectItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Segmento</Label>
            <Select value={segment} onValueChange={setSegment}>
              {SEGMENT_OPTIONS.concat(
                segmentsFromData
                  .filter((value) => !SEGMENT_OPTIONS.some((option) => option.value === value))
                  .map((value) => ({ value, label: value }))
              ).map((option) => (
                <SelectItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fonte de dados</Label>
            <Select value={source} onValueChange={(value) => setSource(value as 'internal' | 'external')}>
              {SOURCE_OPTIONS.map((option) => (
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
              ? 'Sugestões fornecidas gratuitamente pela Clearbit Autocomplete. Preencha palavras-chave para buscar.'
              : 'Em breve: integrações com provedores externos de dados para sugestões em tempo real.'}
          </p>
          <Button variant="primary" onClick={() => prospectsQuery.refetch()} disabled={isSearchDisabled}>
            Buscar prospects
          </Button>
        </div>
        {isExternalSource && !debouncedKeywords ? (
          <p className="rounded-lg border border-outline/40 bg-white px-4 py-2 text-xs text-warning">
            Informe pelo menos duas letras nas palavras-chave para buscar sugestões externas.
          </p>
        ) : null}
      </Card>

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          Não foi possível carregar os prospects: {loadError.message}
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {isExternalSource && !debouncedKeywords ? (
          <Card className="col-span-full border border-outline/40 bg-warning-soft/30 px-6 py-10 text-center text-sm text-warning">
            Para buscar sugestões externas, informe palavras-chave relevantes e clique em "Buscar prospects".
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
            Nenhum prospect cadastrado ainda. Utilize o botão acima para buscar novamente ou cadastre manualmente quando a integração estiver disponível.
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
                {prospect.opportunity ?? 'Sem oportunidade cadastrada.'}
              </div>
              <div className="text-xs text-muted">
                {prospect.email ? <p>E-mail: {prospect.email}</p> : null}
                {prospect.phone ? <p>Telefone: {prospect.phone}</p> : null}
              </div>
              <div className="mt-auto flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Ver detalhes
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  Adicionar ao CRM
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
