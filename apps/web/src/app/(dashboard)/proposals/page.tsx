'use client';

import Link from "next/link";
import { useFormatter } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { ProposalStatus, ProposalSummary, ProposalsResponse } from "@/types/api";

const STATUS_LABELS: Record<ProposalStatus, { label: string; tone: 'neutral' | 'success' | 'warning' | 'info' | 'danger' }> = {
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
  PENDING: { label: 'Pendente', tone: 'warning' },
  SENT: { label: 'Enviada', tone: 'info' },
  ACCEPTED: { label: 'Aceita', tone: 'success' },
  DECLINED: { label: 'Recusada', tone: 'danger' },
  EXPIRED: { label: 'Expirada', tone: 'danger' },
};

function getStatusInfo(status: ProposalStatus) {
  return STATUS_LABELS[status] ?? STATUS_LABELS.DRAFT;
}

export default function ProposalsPage() {
  const api = useApi();
  const format = useFormatter();

  const proposalsQuery = useQuery({
    queryKey: ['proposals', 'list'],
    queryFn: () => api.get<ProposalsResponse>('/proposals'),
    enabled: Boolean(api.token),
  });

  const proposals = proposalsQuery.data?.data ?? [];
  const isTokenMissing = !api.token;
  const loadError = proposalsQuery.error as Error | null;

  const formatDate = (proposal: ProposalSummary) =>
    format.dateTime(new Date(proposal.createdAt), {
      dateStyle: 'long',
    });

  const handleCopyLink = (proposalId: string) => {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    const shareUrl = `${window.location.origin}/proposals/${proposalId}`;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  };

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para visualizar as propostas reais.
        </Card>
      ) : null}

      <PageHeader
        title="Minhas Propostas"
        description="Acompanhe status, gere PDFs e compartilhe links rápidos com seus clientes."
        action={
          <Button variant="primary" className="w-full sm:w-auto" asChild>
            <Link href="/proposals/new">Criar nova proposta</Link>
          </Button>
        }
      />

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          Não foi possível carregar as propostas: {loadError.message}
        </Card>
      ) : null}

      <Card className="rounded-3xl border-outline bg-white/90 p-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px] table-auto text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-6 py-4 text-left font-medium">Cliente</th>
                <th className="px-6 py-4 text-left font-medium">Título</th>
                <th className="px-6 py-4 text-left font-medium">Data de criação</th>
                <th className="px-6 py-4 text-left font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {proposalsQuery.isLoading ? (
                <tr className="border-t border-outline/60">
                  <td colSpan={5} className="px-6 py-5 text-center text-muted">
                    Carregando propostas...
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr className="border-t border-outline/60">
                  <td colSpan={5} className="px-6 py-10 text-center text-muted">
                    Nenhuma proposta encontrada. Utilize o botão acima para criar a primeira.
                  </td>
                </tr>
              ) : (
                proposals.map((proposal) => {
                  const statusInfo = getStatusInfo(proposal.status);
                  return (
                    <tr
                      key={proposal.id}
                      className="border-t border-outline/60 transition hover:bg-surface/40"
                    >
                      <td className="px-6 py-5 text-ink">
                        {proposal.client?.name ?? 'Sem cliente associado'}
                      </td>
                      <td className="px-6 py-5 text-muted">{proposal.title ?? proposal.template?.name ?? '—'}</td>
                      <td className="px-6 py-5 text-muted">{formatDate(proposal)}</td>
                      <td className="px-6 py-5">
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-6 py-5 text-right text-sm font-medium text-primary">
                        <div className="inline-flex items-center gap-3">
                          <Link href={`/proposals/${proposal.id}`} className="hover:underline">
                            Ver proposta
                          </Link>
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => handleCopyLink(proposal.id)}
                          >
                            Copiar link
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
