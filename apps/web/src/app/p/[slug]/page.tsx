"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Carregando proposta...</p>
      </main>
    );
  }

  if (!propostaQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md px-6 py-6 text-center text-sm text-muted">
          Proposta não encontrada. Verifique o link recebido.
        </Card>
      </main>
    );
  }

  const proposta = propostaQuery.data.data;
  const situacao = descreverSituacao(proposta);
  const podeResponder = proposta.status === "SENT";

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted">{proposta.companyName}</p>
            <h1 className="text-xl font-semibold text-ink">{proposta.title}</h1>
            <p className="text-sm text-muted">
              Valor total: <span className="font-semibold text-ink">{proposta.total}</span>
              {descreverValidade(proposta)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proposta.pdfUrl && (
              <Button variant="outline" asChild>
                <a href={proposta.pdfUrl} target="_blank" rel="noopener noreferrer">
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
                Aceitar proposta
              </Button>
            )}
          </div>
        </Card>

        {situacao && (
          <Card className="px-6 py-4">
            <Badge tone={situacao.tom}>{situacao.texto}</Badge>
          </Card>
        )}

        {confirmarRecusa && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border border-danger/30 px-6 py-4 text-sm">
            <span className="text-ink">Tem certeza que deseja recusar esta proposta?</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setConfirmarRecusa(false)}>
                Voltar
              </Button>
              <Button
                variant="danger"
                onClick={() => responder.mutate("decline")}
                loading={responder.isPending}
                loadingText="Enviando..."
              >
                Confirmar recusa
              </Button>
            </div>
          </Card>
        )}

        {responder.isError && (
          <Card className="border border-danger/30 bg-danger-soft/40 px-6 py-4 text-sm text-danger">
            {responder.error.message}
          </Card>
        )}

        <Card className="overflow-hidden p-0">
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
