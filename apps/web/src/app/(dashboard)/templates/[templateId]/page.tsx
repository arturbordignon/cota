"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
              <Link href="/templates">{t("backButton")}</Link>
            </Button>
          }
        />
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          {t("alerts.missingToken")}
        </Card>
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button asChild variant="ghost">
              <Link href="/templates">{t("backButton")}</Link>
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={duplicateMutation.isPending || !template}
            >
              {duplicateMutation.isPending ? t("actions.duplicating") : t("actions.duplicate")}
            </Button>
          </div>
        }
      />

      {feedback ? (
        <Card
          className={`border px-6 py-4 text-sm ${
            feedback.tone === "info"
              ? "border-info/40 bg-info-soft text-info"
              : "border-danger/40 bg-danger-soft/20 text-danger"
          }`}
        >
          {feedback.message}
        </Card>
      ) : null}

      {templateQuery.isLoading ? (
        <Card className="h-48 animate-pulse rounded-3xl border border-outline/40 bg-white/70" />
      ) : null}

      {templateQuery.error ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t("errors.load", { message: (templateQuery.error as Error).message })}
        </Card>
      ) : null}

      {!templateQuery.isLoading && !template ? (
        <Card className="border border-outline/40 bg-white px-6 py-8 text-center text-muted">
          {t("errors.notFound")}
        </Card>
      ) : null}

      {template ? (
        <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
          <Card className="flex flex-col gap-4 rounded-3xl border border-outline/60 bg-white p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{t("info.title")}</span>
              <Badge tone={isSystemTemplate ? "info" : "neutral"}>
                {isSystemTemplate ? t("badges.system") : t("badges.custom")}
              </Badge>
            </div>

            <dl className="space-y-3 text-sm text-muted">
              <div>
                <dt className="font-medium text-ink">{t("info.locale")}</dt>
                <dd>{localeLabel}</dd>
              </div>
              {template.category ? (
                <div>
                  <dt className="font-medium text-ink">{t("info.category")}</dt>
                  <dd>{template.category}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-ink">{t("info.createdAt")}</dt>
                <dd>{formatter.dateTime(new Date(template.createdAt), { dateStyle: "medium", timeStyle: "short" })}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink">{t("info.updatedAt")}</dt>
                <dd>{formatter.dateTime(new Date(template.updatedAt), { dateStyle: "medium", timeStyle: "short" })}</dd>
              </div>
            </dl>
          </Card>

          <Card className="overflow-hidden rounded-3xl border border-outline/60 bg-white">
            <header className="flex items-center justify-between border-b border-outline/30 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {t("preview.title")}
              </h2>
              <span className="text-xs text-muted">{t("preview.subtitle")}</span>
            </header>
            <div className="max-h-[70vh] overflow-auto bg-white px-6 py-6">
              <div
                className="rounded-2xl border border-outline/20 bg-surface px-6 py-6 text-sm text-ink"
                dangerouslySetInnerHTML={{ __html: template.htmlBody }}
              />
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
