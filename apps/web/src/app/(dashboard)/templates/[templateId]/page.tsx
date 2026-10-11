"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CaretLeft, Copy } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import type { TemplateDetailResponse } from "@/types/api";

type FeedbackState =
  | { tone: "info"; message: string }
  | { tone: "danger"; message: string }
  | null;

export default function TemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const templateId = params.templateId;
  const api = useApi();
  const t = useTranslations("templates.detail");
  const formatter = useFormatter();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const templateQuery = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => api.get<TemplateDetailResponse>(`/templates/${templateId}`),
    enabled: Boolean(api.token),
  });

  const template = templateQuery.data?.data;
  const isSystemTemplate = useMemo(() => !template?.accountId, [template?.accountId]);
  const localeLabel = useMemo(() => {
    if (!template) return "";
    return template.locale === "en" ? t("locales.en") : t("locales.ptBR");
  }, [template, t]);

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!template) {
        throw new Error(t("errors.unavailable"));
      }

      const payload = {
        name: `${template.name} ${t("duplicateSuffix")}`.trim(),
        description: template.description ?? undefined,
        locale: template.locale,
        category: template.category ?? undefined,
        htmlBody: template.htmlBody,
        inputSchemaJson: template.inputSchemaJson ?? {},
        defaultDataJson: template.defaultDataJson ?? {},
        pdfLayoutOptionsJson: template.pdfLayoutOptionsJson ?? {},
        isActive: true,
      };

      return api.post<TemplateDetailResponse>("/templates", payload);
    },
    onSuccess: () => {
      setFeedback({ tone: "info", message: t("duplicateSuccess") });
      router.push("/templates?scope=custom");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t("errors.duplicate");
      setFeedback({ tone: "danger", message });
    },
  });

  const handleDuplicate = () => {
    setFeedback(null);
    duplicateMutation.mutate();
  };

  if (!api.token) {
    return (
      <section className="space-y-6">
        <PageHeader
          title={t("titleFallback")}
          description={t("descriptionFallback")}
          action={
            <Button asChild variant="ghost">
              <Link href="/templates">
                <CaretLeft size={14} weight="bold" />
                {t("backButton")}
              </Link>
            </Button>
          }
        />
        <Notice tone="warning">{t("alerts.missingToken")}</Notice>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={template?.name ?? t("loadingTitle")}
        description={
          template?.description ?? t(templateQuery.isLoading ? "loadingDescription" : "defaultDescription")
        }
        action={
          <>
            <Button asChild variant="ghost">
              <Link href="/templates">
                <CaretLeft size={14} weight="bold" />
                {t("backButton")}
              </Link>
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={!template}
              loading={duplicateMutation.isPending}
              loadingText={t("actions.duplicating")}
            >
              <Copy size={16} />
              {t("actions.duplicate")}
            </Button>
          </>
        }
      />

      {feedback ? <Notice tone={feedback.tone}>{feedback.message}</Notice> : null}

      {templateQuery.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : null}

      {templateQuery.error ? (
        <Notice tone="danger">{t("errors.load", { message: (templateQuery.error as Error).message })}</Notice>
      ) : null}

      {!templateQuery.isLoading && !template ? <EmptyState title={t("errors.notFound")} /> : null}

      {template ? (
        <div className="grid items-start gap-6 lg:grid-cols-[320px,1fr]">
          <Card className="p-5 lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>{t("info.title")}</CardTitle>
              <Badge tone={isSystemTemplate ? "brand" : "neutral"}>
                {isSystemTemplate ? t("badges.system") : t("badges.custom")}
              </Badge>
            </CardHeader>

            <dl className="mt-4 divide-y divide-border text-sm">
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{t("info.locale")}</dt>
                <dd className="text-right font-medium text-ink">{localeLabel}</dd>
              </div>
              {template.category ? (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">{t("info.category")}</dt>
                  <dd className="text-right font-medium text-ink">{template.category}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{t("info.createdAt")}</dt>
                <dd className="tabular text-right font-medium text-ink">
                  {formatter.dateTime(new Date(template.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{t("info.updatedAt")}</dt>
                <dd className="tabular text-right font-medium text-ink">
                  {formatter.dateTime(new Date(template.updatedAt), { dateStyle: "medium", timeStyle: "short" })}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
              <CardTitle>{t("preview.title")}</CardTitle>
              <span className="text-xs text-muted">{t("preview.subtitle")}</span>
            </header>
            <div className="max-h-[75vh] overflow-auto bg-surface-muted p-4 sm:p-8">
              <div
                className="mx-auto max-w-[820px] rounded-lg border border-border bg-white px-6 py-8 text-sm text-ink shadow-card sm:px-10"
                dangerouslySetInnerHTML={{ __html: template.htmlBody }}
              />
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
