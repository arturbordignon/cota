"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { TemplateSummary, TemplatesResponse } from "@/types/api";

interface CreateTemplatePayload {
  name: string;
  description?: string;
  category?: string;
  locale: "pt-BR" | "en";
  htmlBody: string;
}

const DEFAULT_HTML_BODY = `<section style="font-family: Inter, Arial, sans-serif; padding: 24px;">
  <h1 style="font-size: 24px; margin-bottom: 16px;">Proposta Comercial</h1>
  <p style="margin-bottom: 12px;">Use este espaço para apresentar a sua empresa, serviços e condições.</p>
  <ul>
    <li>Escopo resumido</li>
    <li>Investimento estimado</li>
    <li>Prazo de execução</li>
  </ul>
</section>`;

function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateTemplatePayload) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [locale, setLocale] = useState<"pt-BR" | "en">("pt-BR");
  const [htmlBody, setHtmlBody] = useState(DEFAULT_HTML_BODY);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setLocale("pt-BR");
    setHtmlBody(DEFAULT_HTML_BODY);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || htmlBody.trim().length < 10) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      locale,
      htmlBody: htmlBody.trim(),
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:items-center">
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-2xl max-h-[90vh] md:max-h-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-outline/20 px-6 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-ink">Criar modelo</Dialog.Title>
                <Dialog.Description className="text-xs text-muted">
                  Defina um layout e reutilize nas propostas da sua equipe.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                  aria-label="Fechar"
                >
                  <X size={16} weight="bold" />
                </button>
              </Dialog.Close>
            </header>

            <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do modelo</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: Proposta padrão de locação"
                  required
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Descrição</Label>
                <Input
                  id="template-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Resumo exibido na listagem"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-category">Categoria</Label>
                  <Input
                    id="template-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Ex.: Operações"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={locale} onValueChange={(value) => setLocale(value as "pt-BR" | "en")}> 
                    <SelectItem value="pt-BR">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-html">HTML do modelo</Label>
                <Textarea
                  id="template-html"
                  value={htmlBody}
                  onChange={(event) => setHtmlBody(event.target.value)}
                  rows={8}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted">Use HTML básico. Você pode ajustar estilos posteriormente.</p>
              </div>
              {errorMessage ? (
                <p className="rounded-lg border border-danger/40 bg-danger-soft/20 px-3 py-2 text-sm text-danger">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <footer className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={isSubmitting || !name.trim() || htmlBody.trim().length < 10}>
                {isSubmitting ? 'Criando…' : 'Criar modelo'}
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const createTemplate = useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      api.post(`/templates`, {
        name: payload.name,
        description: payload.description,
        locale: payload.locale,
        category: payload.category,
        htmlBody: payload.htmlBody,
        inputSchemaJson: {},
        defaultDataJson: {},
        pdfLayoutOptionsJson: {},
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setDialogOpen(false);
      setActiveTab("mine");
    },
  });

  const handleCreateTemplate = (values: CreateTemplatePayload) =>
    createTemplate.mutateAsync(values);

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
        action={
          <Button
            className="w-full sm:w-auto"
            onClick={() => setDialogOpen(true)}
            disabled={isTokenMissing}
          >
            Criar novo modelo
          </Button>
        }
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
                <Button onClick={() => setDialogOpen(true)} disabled={isTokenMissing}>
                  Criar modelo personalizado
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {!isTokenMissing ? (
        <CreateTemplateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleCreateTemplate}
          isSubmitting={createTemplate.isPending}
          errorMessage={createTemplate.error?.message}
        />
      ) : null}
    </section>
  );
}
