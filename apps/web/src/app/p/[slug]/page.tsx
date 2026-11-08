"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, DownloadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { RespostaJaRegistrada, buscarPropostaPublica, responderPropostaPublica } from "@/lib/public-client";
import type { PublicProposal } from "@/types/api";

type IdiomaProposta = "pt-BR" | "en";

// The client reads the page in the language of the proposal, whatever their
// browser is set to, so the buttons match the document.
const TEXTOS = {
  "pt-BR": {
    accepted: "Proposta aceita. Obrigado! A empresa entrará em contato.",
    declined: "Proposta recusada.",
    expired: "Esta proposta expirou. Solicite uma nova à empresa.",
    total: "Valor total",
    validUntil: (data: string) => ` · Válida até ${data}`,
    download: "Baixar PDF",
    decline: "Recusar",
    accept: "Aceitar proposta",
    sending: "Enviando...",
    back: "Voltar",
    confirmDecline: "Confirmar recusa",
    declineQuestion: "Tem certeza que deseja recusar esta proposta?",
    alreadyAnswered: "Esta proposta já foi respondida.",
    answerError: "Não foi possível enviar a sua resposta. Tente novamente.",
  },
  en: {
    accepted: "Proposal accepted. Thank you! The company will be in touch.",
    declined: "Proposal declined.",
    expired: "This proposal has expired. Ask the company for a new one.",
    total: "Total",
    validUntil: (data: string) => ` · Valid until ${data}`,
    download: "Download PDF",
    decline: "Decline",
    accept: "Accept proposal",
    sending: "Sending...",
    back: "Back",
    confirmDecline: "Confirm decline",
    declineQuestion: "Are you sure you want to decline this proposal?",
    alreadyAnswered: "This proposal was already answered.",
    answerError: "We couldn't send your answer. Try again.",
  },
} as const;

function idiomaDaProposta(proposta: PublicProposal): IdiomaProposta {
  return proposta.locale === "en" ? "en" : "pt-BR";
}

function descreverSituacao(proposta: PublicProposal) {
  const textos = TEXTOS[idiomaDaProposta(proposta)];
  switch (proposta.status) {
    case "ACCEPTED":
      return { tom: "success" as const, texto: textos.accepted };
    case "DECLINED":
      return { tom: "danger" as const, texto: textos.declined };
    case "EXPIRED":
      return { tom: "warning" as const, texto: textos.expired };
    default:
      return null;
  }
}

function descreverValidade(proposta: PublicProposal) {
  if (!proposta.expiresAt) {
    return "";
  }
  const idioma = idiomaDaProposta(proposta);
  return TEXTOS[idioma].validUntil(new Date(proposta.expiresAt).toLocaleDateString(idioma));
}

export default function PublicProposalPage() {
  const params = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [confirmarRecusa, setConfirmarRecusa] = useState(false);
  const tNaoEncontrada = useTranslations("publicProposal.notFound");

  const propostaQuery = useQuery({
    queryKey: ["public-proposal", params.slug],
    queryFn: () => buscarPropostaPublica(params.slug),
    retry: false,
  });

  const responder = useMutation({
    mutationFn: (resposta: "accept" | "decline") => responderPropostaPublica(params.slug, resposta),
    onSettled: () => {
      setConfirmarRecusa(false);
      queryClient.invalidateQueries({ queryKey: ["public-proposal", params.slug] });
    },
  });

  if (propostaQuery.isLoading) {
    return (
      <main className="min-h-screen bg-surface-muted px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-[60vh] rounded-xl" />
        </div>
      </main>
    );
  }

  if (!propostaQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
        <EmptyState
          className="max-w-md"
          title={tNaoEncontrada("title")}
          description={tNaoEncontrada("description")}
        />
      </main>
    );
  }

  const proposta = propostaQuery.data.data;
  const situacao = descreverSituacao(proposta);
  const podeResponder = proposta.status === "SENT";
  const textos = TEXTOS[idiomaDaProposta(proposta)];

  return (
    <main className="min-h-screen bg-surface-muted pb-12">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-semibold text-primary-strong">{proposta.companyName}</p>
            <h1 className="text-balance font-display text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">
              {proposta.title}
            </h1>
            <p className="text-sm text-muted">
              {textos.total}{" "}
              <span className="tabular font-display text-lg font-semibold text-ink">{proposta.total}</span>
              {descreverValidade(proposta)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proposta.pdfUrl && (
              <Button variant="secondary" asChild>
                <a href={proposta.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <DownloadSimple size={16} weight="bold" />
                  {textos.download}
                </a>
              </Button>
            )}
            {podeResponder && (
              <Button variant="ghost" onClick={() => setConfirmarRecusa(true)} disabled={responder.isPending}>
                {textos.decline}
              </Button>
            )}
            {podeResponder && (
              <Button
                onClick={() => responder.mutate("accept")}
                loading={responder.isPending && responder.variables === "accept"}
                loadingText={textos.sending}
              >
                <Check size={16} weight="bold" />
                {textos.accept}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 px-4 pt-6 sm:px-8">
        {situacao && <Notice tone={situacao.tom}>{situacao.texto}</Notice>}

        {confirmarRecusa && (
          <Notice
            tone="danger"
            action={
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmarRecusa(false)}>
                  {textos.back}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => responder.mutate("decline")}
                  loading={responder.isPending}
                  loadingText={textos.sending}
                >
                  {textos.confirmDecline}
                </Button>
              </div>
            }
          >
            {textos.declineQuestion}
          </Notice>
        )}

        {responder.isError && (
          <Notice tone="danger">
            {responder.error instanceof RespostaJaRegistrada ? textos.alreadyAnswered : textos.answerError}
          </Notice>
        )}

        <Card className="overflow-hidden">
          <iframe
            title={proposta.title}
            srcDoc={proposta.html}
            sandbox=""
            className="h-[80vh] w-full border-0 bg-white"
          />
        </Card>
      </div>
    </main>
  );
}
