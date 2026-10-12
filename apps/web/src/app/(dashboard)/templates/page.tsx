"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretRight, Files, PaintBrush, Plus, UploadSimple } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const t = useTranslations("templates.dialog");
  const currentLocale = useLocale();
  const defaultHtml = t("defaultHtml");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [locale, setLocale] = useState<"pt-BR" | "en">(currentLocale === "pt-BR" ? "pt-BR" : "en");
  const [htmlBody, setHtmlBody] = useState(defaultHtml);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setLocale(currentLocale === "pt-BR" ? "pt-BR" : "en");
    setHtmlBody(defaultHtml);
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
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      description={t("description")}
      closeLabel={t("close")}
      size="lg"
      onSubmit={handleSubmit}
    >
      <ModalBody>
        <Field label={t("fields.name")} htmlFor="template-name">
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("placeholders.name")}
            required
            disabled={isSubmitting}
            autoFocus
          />
        </Field>
        <Field label={t("fields.description")} htmlFor="template-description">
          <Input
            id="template-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("placeholders.description")}
            disabled={isSubmitting}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("fields.category")} htmlFor="template-category">
            <Input
              id="template-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder={t("placeholders.category")}
              disabled={isSubmitting}
            />
          </Field>
          <Field label={t("fields.locale")} htmlFor="template-locale">
            <Select
              id="template-locale"
              value={locale}
              onValueChange={(value) => setLocale(value as "pt-BR" | "en")}
            >
              <SelectItem value="pt-BR">{t("localeLabels.ptBR")}</SelectItem>
              <SelectItem value="en">{t("localeLabels.en")}</SelectItem>
            </Select>
          </Field>
        </div>
        <Field label={t("fields.html")} htmlFor="template-html" hint={t("fields.htmlHint")}>
          <Textarea
            id="template-html"
            value={htmlBody}
            onChange={(event) => setHtmlBody(event.target.value)}
            rows={8}
            className="font-mono text-[13px]"
            disabled={isSubmitting}
          />
        </Field>
        {errorMessage ? <Notice tone="danger">{errorMessage}</Notice> : null}
      </ModalBody>
      <ModalFooter>
        <ModalClose asChild>
          <Button type="button" variant="ghost" disabled={isSubmitting}>
            {t("actions.cancel")}
          </Button>
        </ModalClose>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || htmlBody.trim().length < 10}
          loading={isSubmitting}
          loadingText={t("actions.saving")}
        >
          {t("actions.submit")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

type TabValue = "catalog" | "mine" | "upload";

export default function TemplatesPage() {
  const t = useTranslations("templates.page");
  const [activeTab, setActiveTab] = useState<TabValue>("catalog");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const api = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const scope = activeTab === "mine" ? "custom" : "system";
  const shouldFetch = activeTab !== "upload" && Boolean(api.token);

  const templatesQuery = useQuery({
    queryKey: ['templates', scope],
    queryFn: () => api.get<TemplatesResponse>(`/templates?scope=${scope}`),
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

  const handleCreateTemplate = async (values: CreateTemplatePayload) => {
    await createTemplate.mutateAsync(values);
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("header.title")}
        description={t("header.description")}
        action={
          <>
            <Button asChild variant="secondary">
              <Link href="/templates/builder">
                <PaintBrush size={16} />
                {t("actions.openBuilder")}
              </Link>
            </Button>
            <Button onClick={() => setDialogOpen(true)} disabled={isTokenMissing}>
              <Plus size={16} weight="bold" />
              {t("actions.new")}
            </Button>
          </>
        }
      />

      {isTokenMissing ? <Notice tone="warning">{t("alerts.missingToken")}</Notice> : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:border-b sm:border-border">
          <TabsList className="sm:-mb-px">
            {tabItems.map((item) => (
              <TabsTrigger key={item.id} value={item.id} title={item.description}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {activeTab !== "upload" ? (
            <div className="w-full pb-2 sm:max-w-[220px]">
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
          ) : null}
        </div>
      </Tabs>

      {showUpload ? (
        <EmptyState
          icon={<UploadSimple size={24} weight="bold" />}
          title={t("upload.button")}
          description={t("upload.description")}
          action={
            <Button variant="secondary" size="lg">
              {t("upload.button")}
            </Button>
          }
        />
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
                    {template.category ? (
                      <span className="mb-1.5 text-xs font-semibold text-primary-strong">{template.category}</span>
                    ) : null}
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
                <Button onClick={() => setDialogOpen(true)} disabled={isTokenMissing}>
                  <Plus size={16} weight="bold" />
                  {t("empty.action")}
                </Button>
              }
            />
          )}
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
