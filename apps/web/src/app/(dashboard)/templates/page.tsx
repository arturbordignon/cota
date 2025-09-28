"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { TemplateSummary, TemplatesResponse } from "@/types/api";

const TAB_ITEMS = [
  { id: "catalog", label: "Modelos Padrão", description: "Biblioteca curada para serviços pesados" },
  { id: "mine", label: "Meus Modelos", description: "Favoritos e templates da sua equipe" },
  { id: "upload", label: "Carregar Modelo", description: "Importe PDF ou DOCX e mapeie campos" },
] as const;

type TabValue = (typeof TAB_ITEMS)[number]["id"];

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("catalog");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const locale = useLocale();
  const api = useApi();

  useEffect(() => {
    setCategoryFilter("all");
  }, [activeTab]);

  const scope = activeTab === "mine" ? "custom" : "system";
  const shouldFetch = activeTab !== "upload" && Boolean(api.token);

  const templatesQuery = useQuery({
    queryKey: ['templates', scope, locale],
    queryFn: () => api.get<TemplatesResponse>(`/templates?scope=${scope}&locale=${locale}`),
    enabled: shouldFetch,
  });

  const templates = useMemo(
    () => ((templatesQuery.data?.data ?? []) as TemplateSummary[]),
    [templatesQuery.data]
  );
  const isLoading = templatesQuery.isLoading;
  const loadError = templatesQuery.error as Error | null;

  const categories = useMemo(() => {
    const unique = new Set<string>();
    templates.forEach((template) => {
      if (template.category) {
        unique.add(template.category);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (categoryFilter === "all") {
      return templates;
    }
    return templates.filter((template) =>
      template.category?.toLowerCase() === categoryFilter.toLowerCase()
    );
  }, [categoryFilter, templates]);

  const showUpload = activeTab === "upload";
  const isTokenMissing = !api.token;

  return (
    <section className="space-y-8">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para carregar os templates reais.
        </Card>
      ) : null}

      <PageHeader
        title="Modelos de Propostas"
        description="Crie propostas com rapidez usando modelos sugeridos ou personalizando layouts para o seu negócio."
        action={<Button className="w-full sm:w-auto">Criar novo modelo</Button>}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs items={TAB_ITEMS} defaultValue="catalog" onChange={(value) => setActiveTab(value as TabValue)} />
        {activeTab !== "upload" ? (
          <div className="w-full max-w-xs">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {showUpload ? (
        <Card className="flex flex-col items-center justify-center gap-4 rounded-3xl border-dashed border-outline bg-white/90 px-10 py-16 text-center">
          <p className="max-w-lg text-sm text-muted">
            Arraste e solte arquivos PDF ou DOCX para transformar em modelos preenchíveis. Você poderá mapear campos depois do upload.
          </p>
          <Button variant="secondary" size="lg">
            Carregar arquivo
          </Button>
        </Card>
      ) : (
        <div className="space-y-5">
          {loadError ? (
            <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
              Não foi possível carregar os modelos: {loadError.message}
            </Card>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card
                  key={`skeleton-${index}`}
                  className="h-40 animate-pulse rounded-3xl border border-outline/40 bg-white/70"
                />
              ))
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="flex flex-col justify-between gap-4 border border-outline/60 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-center text-lg font-semibold leading-10 text-primary">
                      {template.name.substring(0, 1)}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-ink">{template.name}</h3>
                      <p className="text-sm text-muted">
                        {template.description ?? 'Sem descrição disponível.'}
                      </p>
                      {template.category ? (
                        <p className="text-xs uppercase tracking-wide text-muted">{template.category}</p>
                      ) : null}
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/templates/${template.id}`}>Usar modelo</Link>
                  </Button>
                </Card>
              ))
            ) : (
              <Card className="col-span-full flex flex-col items-center justify-center gap-3 rounded-3xl border-dashed border-outline bg-white/90 px-10 py-16 text-center text-muted">
                <span className="font-medium text-ink">Nenhum modelo encontrado para este filtro</span>
                <p className="text-sm">Crie um layout do zero ou faça upload de um arquivo existente para começar.</p>
                <Button>Criar modelo personalizado</Button>
              </Card>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
