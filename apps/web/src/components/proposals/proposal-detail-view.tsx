"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowClockwise,
  ClipboardText,
  DownloadSimple,
  Files,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/layout/page-header";
import { useCurrentUser } from "@/components/providers/user-provider";
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

function buscarMensagemErro(error: unknown, mensagemPadrao: string) {
  if (error instanceof Error) {
    return error.message;
  }
  return mensagemPadrao;
}

function copiarTexto(texto: string) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(texto);
  }
  const campoTexto = document.createElement("textarea");
  campoTexto.value = texto;
  document.body.appendChild(campoTexto);
  campoTexto.select();
  document.execCommand("copy");
  document.body.removeChild(campoTexto);
  return Promise.resolve();
}

const TEMPO_MAXIMO_ESPERA_PDF = 90000;

type DadosProposta = { job?: { projectName?: string; siteLocation?: string; schedule?: string } };
type TotaisProposta = { total?: number; days?: number };

function formatarMoeda(valor: number, locale?: string) {
  let moeda = "BRL";
  if (locale === "en") {
    moeda = "USD";
  }
  return new Intl.NumberFormat(locale || "pt-BR", { style: "currency", currency: moeda }).format(valor);
}

function montarResumo(proposta?: ProposalDetail) {
  if (!proposta) {
    return [];
  }
  const dados = (proposta.payloadJson || {}) as DadosProposta;
  const totais = (proposta.totalsJson || {}) as TotaisProposta;
  const itens = [
    { label: "Projeto", value: dados.job?.projectName },
    { label: "Local da operação", value: dados.job?.siteLocation },
    { label: "Período", value: dados.job?.schedule },
  ];
  if (typeof totais.days === "number" && totais.days > 0) {
    itens.push({ label: "Dias de operação", value: String(totais.days) });
  }
  if (typeof totais.total === "number") {
    itens.push({ label: "Valor total", value: formatarMoeda(totais.total, proposta.locale) });
  }
  return itens.filter((item) => item.value);
}

export function ProposalDetailView({ proposalId }: ProposalDetailViewProps) {
  const api = useApi();
  const format = useFormatter();
  const tStatus = useTranslations("proposals.status");
  const queryClient = useQueryClient();
  const { temPermissao } = useCurrentUser();
  const podeEditar = temPermissao("proposals", "edit");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [banner, setBanner] = useState<{ tone: "success" | "info" | "danger"; text: string } | null>(
    null
  );
  const searchParams = useSearchParams();
  const [esperaPdf, setEsperaPdf] = useState<{ atualizadoEm?: string; inicio: number } | null>(() => {
    if (searchParams.get("queued") !== "1") {
      return null;
    }
    return { inicio: Date.now() };
  });

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
    refetchInterval: () => {
      if (!esperaPdf) {
        return false;
      }
      return 3000;
    },
  });

  const proposal = proposalQuery.data?.data as ProposalDetail | undefined;
  const isTokenMissing = !api.token;
  const loadError = proposalQuery.error as Error | null;
  const isLoading = proposalQuery.isLoading;

  useEffect(() => {
    if (!esperaPdf || !proposal) {
      return;
    }
    if (Date.now() - esperaPdf.inicio > TEMPO_MAXIMO_ESPERA_PDF) {
      setEsperaPdf(null);
      setBanner({ tone: "danger", text: "O PDF está demorando mais que o esperado. Tente novamente em instantes." });
      return;
    }
    if (proposal.updatedAt === esperaPdf.atualizadoEm || !proposal.pdfObjectKey) {
      return;
    }
    setEsperaPdf(null);
    setBanner({ tone: "success", text: "PDF pronto para download." });
  }, [esperaPdf, proposal]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!api.isAuthenticated) {
        throw new Error("Você precisa estar autenticado para gerar o PDF da proposta.");
      }
      return api.post<GenerateProposalResponse>(`/proposals/${proposalId}/generate`, {});
    },
    onSuccess: (response) => {
      setBanner({
        tone: "info",
        text: response.message ?? "PDF em geração.",
      });
      setEsperaPdf({ atualizadoEm: proposal?.updatedAt, inicio: Date.now() });
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

  const enviarProposta = useMutation({
    mutationFn: async () => {
      if (!proposal?.publicSlug) {
        throw new Error("Proposta sem link público.");
      }
      await api.post(`/proposals/${proposal.id}/send`, {});
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals", "list"] });
      let slugPublico = "";
      if (proposal && proposal.publicSlug) {
        slugPublico = proposal.publicSlug;
      }
      const linkPublico = `${window.location.origin}/p/${slugPublico}`;
      try {
        await copiarTexto(linkPublico);
        setCopyState("copied");
        setBanner({ tone: "success", text: "Link público copiado. Envie para o cliente visualizar e responder." });
        return;
      } catch {
        setCopyState("error");
        setBanner({ tone: "info", text: `Proposta enviada. Copie o link: ${linkPublico}` });
      }
    },
    onError: (error: unknown) => {
      setCopyState("error");
      setBanner({ tone: "danger", text: buscarMensagemErro(error, "Não foi possível enviar a proposta.") });
    },
  });

  const baixarPdf = useMutation({
    mutationFn: () => api.get<{ url: string }>(`/proposals/${proposalId}/pdf`),
    onSuccess: (resposta) => {
      window.open(resposta.url, "_blank", "noopener");
    },
    onError: (error: unknown) => {
      setBanner({ tone: "danger", text: buscarMensagemErro(error, "Não foi possível baixar o PDF.") });
    },
  });

  let rotuloLink = "Enviar ao cliente";
  if (copyState === "copied") {
    rotuloLink = "Link copiado";
  }
  if (proposal && proposal.status !== "DRAFT" && proposal.status !== "PENDING" && copyState !== "copied") {
    rotuloLink = "Copiar link público";
  }

  let rotuloGerarPdf = "Gerar PDF";
  if (proposal?.pdfObjectKey) {
    rotuloGerarPdf = "Regerar PDF";
  }

  const resumo = montarResumo(proposal);

  return (
    <section className="space-y-6">
      <PageHeader
        title={proposal?.title ?? proposal?.template?.name ?? "Detalhe da proposta"}
        description={headerDescription}
        action={
          proposal && podeEditar && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending || Boolean(esperaPdf)}
                loadingText="Gerando PDF..."
              >
                <ArrowClockwise size={16} weight="bold" />
                {rotuloGerarPdf}
              </Button>
              <Button
                variant="outline"
                onClick={() => baixarPdf.mutate()}
                loading={baixarPdf.isPending}
                disabled={!proposal.pdfObjectKey}
                className="gap-1"
              >
                <DownloadSimple size={16} weight="bold" />
                Baixar PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => enviarProposta.mutate()}
                loading={enviarProposta.isPending}
                className="gap-1"
              >
                <ClipboardText size={16} weight="bold" />
                {rotuloLink}
              </Button>
            </div>
          )
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

            {resumo.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-ink">Resumo</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {resumo.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-outline/40 bg-[var(--color-surface-muted)]/40 px-4 py-3"
                    >
                      <dt className="text-xs uppercase tracking-wide text-muted">{item.label}</dt>
                      <dd className="mt-1 text-sm text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {payloadEntries.length > 0 && (
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
            )}

            {payloadEntries.length === 0 && resumo.length === 0 && (
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
                  {proposal.pdfObjectKey && (
                    <button
                      type="button"
                      className="mt-1 border-0 bg-transparent p-0 text-left font-medium text-primary hover:underline"
                      onClick={() => baixarPdf.mutate()}
                    >
                      Baixar PDF da proposta
                    </button>
                  )}
                  {!proposal.pdfObjectKey && (
                    <p className="mt-1 text-ink">Ainda não disponível. Clique em &quot;Gerar PDF&quot; para criar o arquivo.</p>
                  )}
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
