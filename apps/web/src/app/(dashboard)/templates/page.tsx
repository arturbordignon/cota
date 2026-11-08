"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretRight, Files, MagnifyingGlass, PaintBrush, Plus, UploadSimple } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { useErrorMessage } from "@/hooks/use-error-message";
import { CreateTemplateDialog, type CreateTemplatePayload } from "@/components/templates/template-dialog";
import { useCurrentUser } from "@/components/providers/user-provider";
import { TemplateSummary, TemplatesResponse } from "@/types/api";

type TabValue = "catalog" | "mine" | "upload";

export default function TemplatesPage() {
  const t = useTranslations("templates.page");
  const mensagemDeErro = useErrorMessage();
  const tIdiomas = useTranslations("templates.dialog.localeLabels");
  const [activeTab, setActiveTab] = useState<TabValue>("catalog");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [busca, setBusca] = useState("");
  const api = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importado, setImportado] = useState<{ name: string; htmlBody: string } | null>(null);
  const [erroImportacao, setErroImportacao] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement | null>(null);

  const importarArquivo = async (arquivo: File | undefined) => {
    setErroImportacao(null);
    if (!arquivo) return;
    const html = (await arquivo.text()).trim();
    if (html.length < 10) {
      setErroImportacao(t("upload.invalid"));
      return;
    }
    setImportado({ name: arquivo.name.replace(/\.html?$/i, ""), htmlBody: html });
    setDialogOpen(true);
  };

  const tabItems = useMemo(
    () => [
      {
        id: "catalog" as const,
        label: t("tabs.catalog.label"),
        description: t("tabs.catalog.description"),
      },
      {
        id: "mine" as const,
        label: t("tabs.mine.label"),
        description: t("tabs.mine.description"),
      },
      {
        id: "upload" as const,
        label: t("tabs.upload.label"),
        description: t("tabs.upload.description"),
      },
    ],
    [t],
  );

  useEffect(() => {
    setCategoryFilter("all");
  }, [activeTab]);

  // The global search lands here with ?search=, and duplicating or saving a
  // template comes back with ?scope=custom to show it under "My templates".
  const searchParams = useSearchParams();
  const termoDaUrl = searchParams.get("search");
  const escopoDaUrl = searchParams.get("scope");
  useEffect(() => {
    if (termoDaUrl !== null) {
      setBusca(termoDaUrl);
    }
  }, [termoDaUrl]);
  useEffect(() => {
    if (escopoDaUrl === "custom") {
      setActiveTab("mine");
    } else if (escopoDaUrl === "system") {
      setActiveTab("catalog");
    }
  }, [escopoDaUrl]);

  const scope = activeTab === "mine" ? "custom" : "system";
  const shouldFetch = activeTab !== "upload" && Boolean(api.token);

  const templatesQuery = useQuery({
    queryKey: ['templates', scope],
    queryFn: () => api.get<TemplatesResponse>(`/templates?scope=${scope}`),
    enabled: shouldFetch,
  });

  // Templates in the account's language come first.
  const { user } = useCurrentUser();
  const idiomaPreferido = user?.account.locale === "en" ? "en" : "pt-BR";
  const templates = useMemo(
    () =>
      [...((templatesQuery.data?.data ?? []) as TemplateSummary[])].sort(
        (a, b) => Number(a.locale !== idiomaPreferido) - Number(b.locale !== idiomaPreferido),
      ),
    [idiomaPreferido, templatesQuery.data]
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
    const termo = busca.trim().toLowerCase();
    return templates.filter((template) => {
      if (categoryFilter !== "all" && template.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (!termo) {
        return true;
      }
      const texto = `${template.name} ${template.description ?? ""} ${template.category ?? ""}`;
      return texto.toLowerCase().includes(termo);
    });
  }, [busca, categoryFilter, templates]);

  const showUpload = activeTab === "upload";
  const isTokenMissing = !api.token;
  // Members who can only view templates don't get create, import or the builder.
  const { temPermissao } = useCurrentUser();
  const podeEditar = !isTokenMissing && temPermissao("templates", "edit");

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

  const handleCreateTemplate = async (values: CreateTemplatePayload) => {
    await createTemplate.mutateAsync(values);
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("header.title")}
        description={t("header.description")}
        action={
          podeEditar ? (
            <>
              <Button asChild variant="secondary">
                <Link href="/templates/builder">
                  <PaintBrush size={16} />
                  {t("actions.openBuilder")}
                </Link>
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus size={16} weight="bold" />
                {t("actions.new")}
              </Button>
            </>
          ) : undefined
        }
      />

      {isTokenMissing ? <Notice tone="warning">{t("alerts.missingToken")}</Notice> : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:border-b sm:border-border">
          <TabsList className="sm:-mb-px">
            {tabItems
              .filter((item) => item.id !== "upload" || podeEditar)
              .map((item) => (
                <TabsTrigger key={item.id} value={item.id} title={item.description}>
                  {item.label}
                </TabsTrigger>
              ))}
          </TabsList>
          {activeTab !== "upload" ? (
            <div className="flex w-full flex-col gap-2 pb-2 sm:max-w-[460px] sm:flex-row">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-outline bg-white px-3 shadow-card focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/25">
                <MagnifyingGlass size={16} className="shrink-0 text-muted" />
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder={t("filters.search")}
                  aria-label={t("filters.search")}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                />
              </label>
              <div className="sm:w-[200px] sm:shrink-0">
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  aria-label={t("filters.category.all")}
                >
                  <SelectItem value="all">{t("filters.category.all")}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          ) : null}
        </div>
      </Tabs>

      {showUpload ? (
        <div className="space-y-3">
          <EmptyState
            icon={<UploadSimple size={24} weight="bold" />}
            title={t("upload.button")}
            description={t("upload.description")}
            action={
              <Button
                variant="secondary"
                size="lg"
                disabled={isTokenMissing}
                onClick={() => arquivoRef.current?.click()}
              >
                {t("upload.button")}
              </Button>
            }
          />
          <input
            ref={arquivoRef}
            type="file"
            accept=".html,.htm,text/html"
            className="hidden"
            onChange={(event) => {
              void importarArquivo(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {erroImportacao ? <Notice tone="danger">{erroImportacao}</Notice> : null}
        </div>
      ) : (
        <div className="space-y-5">
          {loadError ? (
            <Notice tone="danger">{t("alerts.loadError", { message: loadError.message })}</Notice>
          ) : null}

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`skeleton-${index}`} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Link
                  key={template.id}
                  href={`/templates/${template.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-card transition-colors hover:border-outline"
                >
                  <div aria-hidden className="relative h-28 border-b border-border bg-surface-muted px-6 pt-5">
                    <div className="mx-auto h-full max-w-[200px] rounded-t-md border border-b-0 border-border bg-white px-4 pt-3 shadow-card transition-transform duration-200 group-hover:-translate-y-1">
                      <div className="h-1.5 w-10 rounded-full bg-primary" />
                      <div className="mt-2.5 h-1.5 w-28 rounded-full bg-surface-sunken" />
                      <div className="mt-1.5 h-1.5 w-20 rounded-full bg-surface-sunken" />
                      <div className="mt-3 flex justify-between">
                        <div className="h-1.5 w-12 rounded-full bg-surface-sunken" />
                        <div className="h-1.5 w-8 rounded-full bg-ink/20" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      {template.category ? <span className="text-primary-strong">{template.category}</span> : null}
                      <Badge tone="neutral">{tIdiomas(template.locale === "en" ? "en" : "ptBR")}</Badge>
                    </span>
                    <h3 className="font-sans text-[15px] font-semibold leading-snug text-ink">{template.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                      {template.description ?? t("cards.noDescription")}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-ink">
                      {t("cards.use")}
                      <CaretRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Files size={24} weight="bold" />}
              title={t("empty.title")}
              description={t("empty.description")}
              action={
                podeEditar ? (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus size={16} weight="bold" />
                    {t("empty.action")}
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      )}

      {podeEditar ? (
        <CreateTemplateDialog
          open={dialogOpen}
          onOpenChange={(aberto) => {
            setDialogOpen(aberto);
            if (!aberto) setImportado(null);
          }}
          importado={importado}
          onSubmit={handleCreateTemplate}
          isSubmitting={createTemplate.isPending}
          errorMessage={createTemplate.error ? mensagemDeErro(createTemplate.error) : undefined}
        />
      ) : null}
    </section>
  );
}
