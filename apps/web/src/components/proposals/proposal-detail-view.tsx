"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowClockwise,
  ClipboardText,
  Files,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import type {
  GenerateProposalResponse,
  ProposalDetail,
  ProposalDetailResponse,
  ProposalStatus,
} from "@/types/api";

const STATUS_TONES: Record<ProposalStatus, "neutral" | "success" | "warning" | "info" | "danger"> =
  {
    DRAFT: "neutral",
    PENDING: "warning",
    SENT: "info",
    ACCEPTED: "success",
    DECLINED: "danger",
    EXPIRED: "danger",
  };

const formatFieldLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());

const formatFileSize = (size: number | undefined) => {
  if (!size || size <= 0) {
    return "";
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

interface ProposalDetailViewProps {
  proposalId: string;
}

export function ProposalDetailView({ proposalId }: ProposalDetailViewProps) {
  const api = useApi();
  const format = useFormatter();
  const tStatus = useTranslations("proposals.status");
  const queryClient = useQueryClient();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [banner, setBanner] = useState<{ tone: "success" | "info" | "danger"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [copyState]);

  useEffect(() => {
    if (!banner) return;
    const timeout = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timeout);
  }, [banner]);

  const proposalQuery = useQuery<ProposalDetailResponse>({
    queryKey: ["proposals", proposalId],
    queryFn: () => api.get<ProposalDetailResponse>(`/proposals/${proposalId}`),
    enabled: Boolean(api.token),
  });

  const proposal = proposalQuery.data?.data as ProposalDetail | undefined;
  const isTokenMissing = !api.token;
  const loadError = proposalQuery.error as Error | null;
  const isLoading = proposalQuery.isLoading;

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!api.isAuthenticated) {
        throw new Error("Você precisa estar autenticado para gerar o PDF da proposta.");
      }
      return api.post<GenerateProposalResponse>(`/proposals/${proposalId}/generate`, {});
    },
    onSuccess: (response) => {
      setBanner({
        tone: "success",
        text: response.message ?? "Proposta reenfileirada para geração de PDF.",
      });
      queryClient.invalidateQueries({ queryKey: ["proposals", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals", "list"] });
    },
    onError: (error: unknown) => {
      setBanner({
        tone: "danger",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível reenfileirar a proposta para geração.",
      });
    },
  });

  const formatDateTime = (value?: string | null) =>
    value ? format.dateTime(new Date(value), { dateStyle: "medium", timeStyle: "short" }) : "—";

  const payload = useMemo(
    () => ((proposal?.payloadJson ?? {}) as Record<string, unknown>),
    [proposal?.payloadJson]
  );

  const attachmentsField = (payload as { attachments?: unknown }).attachments;
  const attachmentsFromPayload = Array.isArray(attachmentsField)
    ? (attachmentsField as Array<{ name?: string; size?: number; type?: string }>)
    : [];

  const payloadEntries = useMemo(() => {
    return Object.entries(payload)
      .filter(
        ([key, value]) =>
          key !== "attachments" &&
          value != null &&
          typeof value !== "object" &&
          String(value).trim().length > 0
      )
      .map(([key, value]) => ({
        key,
        label: formatFieldLabel(key),
        value: String(value),
      }));
  }, [payload]);

  const displayAttachments =
    proposal?.assets && proposal.assets.length > 0
      ? proposal.assets.map((asset) => ({
          id: asset.id,
          label: asset.s3ObjectKey,
          meta: asset.mimeType,
          size: undefined,
        }))
      : attachmentsFromPayload.map((item, index) => ({
          id: item.name ? `${item.name}-${index}` : `attachment-${index}`,
          label: item.name ?? `Arquivo ${index + 1}`,
          meta: item.type ?? "",
          size: item.size,
        }));

  const statusTone = proposal ? STATUS_TONES[proposal.status] ?? "neutral" : "neutral";
  const statusLabel = proposal ? tStatus(proposal.status) : "";
  const createdAt = proposal ? formatDateTime(proposal.createdAt) : "—";
  const headerDescription = proposal
    ? `Cliente: ${proposal.client?.name ?? "—"} · Criada em ${createdAt}`
    : "Carregando detalhes da proposta...";

  const timeline = [
    { label: "Criada", value: proposal?.createdAt },
    { label: "Enviada", value: proposal?.sentAt },
    { label: "Visualizada", value: proposal?.viewedAt },
    { label: "Aceita", value: proposal?.acceptedAt },
    { label: "Recusada", value: proposal?.declinedAt },
  ];

  const handleCopyLink = () => {
    if (typeof window === "undefined" || !proposal) {
      return;
    }
    const shareSegment = proposal.publicSlug ?? proposal.id;
    const shareUrl = `${window.location.origin}/proposals/${shareSegment}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => setCopyState("copied"))
        .catch(() => {
          setCopyState("error");
          setBanner({ tone: "danger", text: "Não foi possível copiar o link." });
        });
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopyState("copied");
      } catch {
        setCopyState("error");
        setBanner({ tone: "danger", text: "Não foi possível copiar o link." });
      }
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title={proposal?.title ?? proposal?.template?.name ?? "Detalhe da proposta"}
        description={headerDescription}
        action={
          proposal ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending}
                loadingText="Agendando..."
              >
                <ArrowClockwise size={16} weight="bold" />
                Regerar PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyLink}
                disabled={!proposal}
                className="gap-1"
              >
                <ClipboardText size={16} weight="bold" />
                {copyState === "copied" ? "Link copiado" : "Copiar link interno"}
              </Button>
            </div>
          ) : null
        }
      />

      {banner ? (
        <Card
          className={`border ${
            banner.tone === "success"
              ? "border-success/40 bg-success-soft/50 text-success"
              : banner.tone === "danger"
              ? "border-danger/40 bg-danger-soft/40 text-danger"
              : "border-info/40 bg-info-soft/40 text-info"
          } px-6 py-4 text-sm`}
        >
          {banner.text}
        </Card>
      ) : null}

      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft/40 px-6 py-4 text-sm text-warning">
          Autentique-se ou defina o token da API para visualizar os detalhes reais da proposta.
        </Card>
      ) : null}

      {loadError && !isLoading ? (
        <Card className="border border-danger/40 bg-danger-soft/30 px-6 py-4 text-sm text-danger">
          Não foi possível carregar a proposta: {loadError.message}
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="border border-outline/60 bg-white px-6 py-5 text-sm text-muted">
          Carregando detalhes da proposta...
        </Card>
      ) : null}

      {!proposal && !isLoading ? (
        <Card className="border border-outline/60 bg-white px-6 py-5 text-sm text-muted">
          Proposta não encontrada ou você não possui permissão para visualizá-la.
        </Card>
      ) : null}

      {proposal ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <Card className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={statusTone}>{statusLabel}</Badge>
              <span className="text-xs uppercase tracking-[0.25em] text-muted">
                Atualizado em {formatDateTime(proposal.updatedAt)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Cliente</p>
                <p className="mt-1 text-sm text-ink">{proposal.client?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Modelo</p>
                <p className="mt-1 text-sm text-ink">{proposal.template?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Idioma</p>
                <p className="mt-1 text-sm text-ink">{proposal.locale ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Expira em</p>
                <p className="mt-1 text-sm text-ink">{formatDateTime(proposal.expiresAt)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted">Slug público</p>
                <p className="mt-1 break-all text-sm text-ink">{proposal.publicSlug ?? "—"}</p>
              </div>
            </div>

            {payloadEntries.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ink">Dados enviados</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {payloadEntries.map(({ key, label, value }) => (
                    <div
                      key={key}
                      className="rounded-lg border border-outline/40 bg-[var(--color-surface-muted)]/40 px-4 py-3"
                    >
                      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
                      <dd className="mt-1 text-sm text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Nenhum dado adicional foi informado para esta proposta.
              </p>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <PaperPlaneTilt size={18} weight="duotone" className="text-primary" />
                Linha do tempo
              </h3>
              <ul className="space-y-3 text-sm text-muted">
                {timeline.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-outline/40 bg-white px-4 py-3"
                  >
                    <span>{item.label}</span>
                    <span className="text-ink">{formatDateTime(item.value)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Files size={18} weight="duotone" className="text-primary" />
                PDF e anexos
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">PDF gerado</p>
                  <p className="mt-1 break-all text-ink">
                    {proposal.pdfObjectKey ?? "Ainda não disponível. Gere a proposta para criar o PDF."}
                  </p>
                </div>

                {displayAttachments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted">Anexos</p>
                    <ul className="space-y-2">
                      {displayAttachments.map((attachment) => (
                        <li
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-outline/40 bg-[var(--color-surface-muted)]/60 px-3 py-2 text-xs text-muted"
                        >
                          <span className="truncate text-ink">{attachment.label}</span>
                          <span>{formatFileSize(attachment.size) || attachment.meta}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    Nenhum anexo foi associado a esta proposta até o momento.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  );
}
