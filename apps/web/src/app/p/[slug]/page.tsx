"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, DownloadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { buscarPropostaPublica, responderPropostaPublica } from "@/lib/public-client";
import type { PublicProposal } from "@/types/api";

interface PublicProposalPageProps {
  params: { slug: string };
}

function descreverSituacao(proposta: PublicProposal) {
  switch (proposta.status) {
    case "ACCEPTED":
      return { tom: "success" as const, texto: "Proposta aceita. Obrigado! A empresa entrará em contato." };
    case "DECLINED":
      return { tom: "danger" as const, texto: "Proposta recusada." };
    case "EXPIRED":
      return { tom: "warning" as const, texto: "Esta proposta expirou. Solicite uma nova à empresa." };
    default:
      return null;
  }
}

function descreverValidade(proposta: PublicProposal) {
  if (!proposta.expiresAt) {
    return "";
  }
  return ` · Válida até ${new Date(proposta.expiresAt).toLocaleDateString(proposta.locale)}`;
}

export default function PublicProposalPage({ params }: PublicProposalPageProps) {
  const queryClient = useQueryClient();
  const [confirmarRecusa, setConfirmarRecusa] = useState(false);

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
          title="Proposta não encontrada"
          description="Verifique o link recebido ou peça um novo à empresa."
        />
      </main>
    );
  }

  const proposta = propostaQuery.data.data;
  const situacao = descreverSituacao(proposta);
  const podeResponder = proposta.status === "SENT";

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
              Valor total{" "}
              <span className="tabular font-display text-lg font-semibold text-ink">{proposta.total}</span>
              {descreverValidade(proposta)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proposta.pdfUrl && (
              <Button variant="secondary" asChild>
                <a href={proposta.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <DownloadSimple size={16} weight="bold" />
                  Baixar PDF
                </a>
              </Button>
            )}
            {podeResponder && (
              <Button variant="ghost" onClick={() => setConfirmarRecusa(true)} disabled={responder.isPending}>
                Recusar
              </Button>
            )}
            {podeResponder && (
              <Button
                onClick={() => responder.mutate("accept")}
                loading={responder.isPending && responder.variables === "accept"}
                loadingText="Enviando..."
              >
                <Check size={16} weight="bold" />
                Aceitar proposta
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
                  Voltar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => responder.mutate("decline")}
                  loading={responder.isPending}
                  loadingText="Enviando..."
                >
                  Confirmar recusa
                </Button>
              </div>
            }
          >
            Tem certeza que deseja recusar esta proposta?
          </Notice>
        )}

        {responder.isError && <Notice tone="danger">{responder.error.message}</Notice>}

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
