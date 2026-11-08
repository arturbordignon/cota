"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretLeft, Copy, FilePlus, PencilSimple, Trash } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useCurrentUser } from "@/components/providers/user-provider";
import { CreateTemplateDialog, type CreateTemplatePayload } from "@/components/templates/template-dialog";
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
  const mensagemDeErro = useErrorMessage();
  const formatter = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const { temPermissao } = useCurrentUser();
  const podeEditar = temPermissao("templates", "edit");

  const templateQuery = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => api.get<TemplateDetailResponse>(`/templates/${templateId}`),
    enabled: Boolean(api.token),
  });

  // Rendered by the API with sample data; falls back to the raw HTML.
  const previewQuery = useQuery({
    queryKey: ["template", templateId, "preview"],
    queryFn: () => api.get<{ data: { html: string } }>(`/templates/${templateId}/preview`),
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
      const message = mensagemDeErro(error, { padrao: t("errors.duplicate") });
      setFeedback({ tone: "danger", message });
    },
  });

  // Only the account's own templates can be changed; system ones are duplicated.
  const podeAlterar = podeEditar && Boolean(template) && !isSystemTemplate;
  const [editOpen, setEditOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (values: CreateTemplatePayload) =>
      api.put<TemplateDetailResponse>(`/templates/${templateId}`, {
        name: values.name,
        description: values.description ?? "",
        category: values.category ?? "",
        locale: values.locale,
        htmlBody: values.htmlBody,
      }),
    onSuccess: async () => {
      setEditOpen(false);
      setFeedback({ tone: "info", message: t("updateSuccess") });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["template", templateId] }),
        queryClient.invalidateQueries({ queryKey: ["templates"] }),
      ]);
    },
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/templates/${templateId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push("/templates?scope=custom");
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
            {temPermissao("proposals", "edit") && template ? (
              <Button asChild variant="secondary">
                <Link href={`/proposals/new?templateId=${template.id}` as Route}>
                  <FilePlus size={16} />
                  {t("actions.useTemplate")}
                </Link>
              </Button>
            ) : null}
            {podeAlterar ? (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <PencilSimple size={16} />
                {t("actions.edit")}
              </Button>
            ) : null}
            {podeAlterar ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteOpen(true)}
                aria-label={t("actions.delete")}
                title={t("actions.delete")}
                className="hover:bg-danger-soft hover:text-danger"
              >
                <Trash size={18} />
              </Button>
            ) : null}
            {podeEditar ? (
              <Button
                onClick={handleDuplicate}
                disabled={!template}
                loading={duplicateMutation.isPending}
                loadingText={t("actions.duplicating")}
              >
                <Copy size={16} />
                {t("actions.duplicate")}
              </Button>
            ) : null}
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
            <div className="bg-surface-muted p-4 sm:p-8">
              {/* Template HTML is written by account members: render it in a sandbox
                  with no scripts and no access to this page or its stored session. */}
              <iframe
                title={t("preview.title")}
                srcDoc={previewQuery.data?.data.html ?? template.htmlBody}
                sandbox=""
                className="mx-auto block h-[75vh] w-full max-w-[820px] rounded-lg border border-border bg-white shadow-card"
              />
            </div>
          </Card>
        </div>
      ) : null}
      {podeAlterar && template ? (
        <CreateTemplateDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editando={{
            name: template.name,
            description: template.description ?? undefined,
            category: template.category ?? undefined,
            locale: template.locale === "en" ? "en" : "pt-BR",
            htmlBody: template.htmlBody,
          }}
          onSubmit={async (values) => {
            await updateMutation.mutateAsync(values);
          }}
          isSubmitting={updateMutation.isPending}
          errorMessage={updateMutation.error ? mensagemDeErro(updateMutation.error) : undefined}
        />
      ) : null}
      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description", { name: template?.name ?? "" })}
        closeLabel={t("deleteDialog.cancel")}
      >
        {deleteMutation.error ? (
          <ModalBody>
            <Notice tone="danger">{mensagemDeErro(deleteMutation.error)}</Notice>
          </ModalBody>
        ) : null}
        <ModalFooter>
          <ModalClose asChild>
            <Button type="button" variant="ghost" disabled={deleteMutation.isPending}>
              {t("deleteDialog.cancel")}
            </Button>
          </ModalClose>
          <Button type="button" variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            {t("deleteDialog.confirm")}
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
