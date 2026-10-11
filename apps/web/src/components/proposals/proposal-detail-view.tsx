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
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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

  const metadados = proposal
    ? [
        { rotulo: "Cliente", valor: proposal.client?.name ?? "—" },
        { rotulo: "Modelo", valor: proposal.template?.name ?? "—" },
        { rotulo: "Idioma", valor: proposal.locale ?? "—" },
        { rotulo: "Expira em", valor: formatDateTime(proposal.expiresAt) },
      ]
    : [];

  const etapasConcluidas = timeline.filter((item) => Boolean(item.value));

  return (
    <section className="space-y-6">
      <PageHeader
        title={proposal?.title ?? proposal?.template?.name ?? "Detalhe da proposta"}
        description={headerDescription}
        action={
          proposal && podeEditar && (
            <>
              <Button
                variant="secondary"
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending || Boolean(esperaPdf)}
                loadingText="Gerando PDF..."
              >
                <ArrowClockwise size={16} weight="bold" />
                {rotuloGerarPdf}
              </Button>
              <Button
                variant="secondary"
                onClick={() => baixarPdf.mutate()}
                loading={baixarPdf.isPending}
                disabled={!proposal.pdfObjectKey}
              >
                <DownloadSimple size={16} weight="bold" />
                Baixar PDF
              </Button>
              <Button onClick={() => enviarProposta.mutate()} loading={enviarProposta.isPending}>
                <ClipboardText size={16} weight="bold" />
                {rotuloLink}
              </Button>
            </>
          )
        }
      />

      {banner ? <Notice tone={banner.tone}>{banner.text}</Notice> : null}

      {isTokenMissing ? (
        <Notice tone="warning">
          Autentique-se ou defina o token da API para visualizar os detalhes reais da proposta.
        </Notice>
      ) : null}

      {loadError && !isLoading ? (
        <Notice tone="danger">Não foi possível carregar a proposta: {loadError.message}</Notice>
      ) : null}

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : null}

      {!proposal && !isLoading ? (
        <EmptyState
          title="Proposta não encontrada"
          description="Ela pode ter sido removida ou você não possui permissão para visualizá-la."
        />
      ) : null}

      {proposal ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <Badge tone={statusTone} dot>
                {statusLabel}
              </Badge>
              <span className="text-xs text-muted">Atualizada em {formatDateTime(proposal.updatedAt)}</span>
            </div>

            <div className="space-y-7 p-6">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {metadados.map((item) => (
                  <div key={item.rotulo}>
                    <dt className="meta-label">{item.rotulo}</dt>
                    <dd className="mt-1 text-[15px] font-medium text-ink">{item.valor}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="meta-label">Link público</dt>
                  <dd className="mt-1 break-all text-sm text-ink-muted">
                    {proposal.publicSlug ? `/p/${proposal.publicSlug}` : "—"}
                  </dd>
                </div>
              </dl>

              {resumo.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-sans text-[15px] font-semibold text-ink">Resumo da operação</h3>
                  <dl className="divide-y divide-border rounded-lg border border-border">
                    {resumo.map((item) => (
                      <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
                        <dt className="text-sm text-muted">{item.label}</dt>
                        <dd className="tabular text-sm font-semibold text-ink">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {payloadEntries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-sans text-[15px] font-semibold text-ink">Dados enviados</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {payloadEntries.map(({ key, label, value }) => (
                      <div key={key} className="rounded-lg bg-surface-muted px-4 py-3">
                        <dt className="meta-label">{label}</dt>
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
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <CardTitle className="flex items-center gap-2">
                <PaperPlaneTilt size={18} weight="bold" className="text-primary-strong" />
                Linha do tempo
              </CardTitle>
              <ol className="mt-4">
                {timeline.map((item, indice) => {
                  const feito = Boolean(item.value);
                  const ultimo = indice === timeline.length - 1;
                  return (
                    <li key={item.label} className="relative flex gap-3 pb-4 last:pb-0">
                      {!ultimo ? (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-[7px] top-5 h-[calc(100%-12px)] w-0.5 rounded-full",
                            feito && Boolean(timeline[indice + 1]?.value) ? "bg-ink" : "bg-border",
                          )}
                        />
                      ) : null}
                      <span
                        aria-hidden
                        className={cn(
                          "relative mt-1 h-4 w-4 shrink-0 rounded-full border-2",
                          feito ? "border-ink bg-ink" : "border-outline bg-white",
                          feito && item === etapasConcluidas[etapasConcluidas.length - 1] && "border-primary bg-primary ring-4 ring-primary/20",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold", feito ? "text-ink" : "text-muted")}>{item.label}</p>
                        <p className="tabular text-xs text-muted">{formatDateTime(item.value)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <Card className="p-5">
              <CardTitle className="flex items-center gap-2">
                <Files size={18} weight="bold" className="text-primary-strong" />
                PDF e anexos
              </CardTitle>
              <div className="mt-4 space-y-4 text-sm">
                {proposal.pdfObjectKey ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-outline hover:bg-surface-muted"
                    onClick={() => baixarPdf.mutate()}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-xs font-bold text-danger">
                      PDF
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">Baixar PDF da proposta</span>
                      <span className="block truncate text-xs text-muted">{proposal.title ?? proposal.template?.name}</span>
                    </span>
                    <DownloadSimple size={16} className="shrink-0 text-muted" />
                  </button>
                ) : (
                  <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-ink-muted">
                    Ainda não disponível. Clique em &quot;Gerar PDF&quot; para criar o arquivo.
                  </p>
                )}

                <div className="space-y-2">
                  <p className="meta-label">Anexos</p>
                  {displayAttachments.length > 0 ? (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {displayAttachments.map((attachment) => (
                        <li
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted"
                        >
                          <span className="truncate text-ink">{attachment.label}</span>
                          <span className="shrink-0">{formatFileSize(attachment.size) || attachment.meta}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted">
                      Nenhum anexo foi associado a esta proposta até o momento.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  );
}
