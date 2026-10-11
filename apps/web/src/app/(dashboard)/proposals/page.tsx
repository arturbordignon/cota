'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { FilterBar } from "@/components/layout/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { useCurrentUser } from "@/components/providers/user-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { ProposalStatus, ProposalSummary, ProposalsResponse } from "@/types/api";

const STATUS_TONES: Record<ProposalStatus, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  SENT: 'info',
  ACCEPTED: 'success',
  DECLINED: 'danger',
  EXPIRED: 'danger',
};

export default function ProposalsPage() {
  const api = useApi();
  const { temPermissao } = useCurrentUser();
  const format = useFormatter();
  const t = useTranslations("proposals.page");
  const tStatus = useTranslations("proposals.status");

  const proposalsQuery = useQuery({
    queryKey: ['proposals', 'list'],
    queryFn: () => api.get<ProposalsResponse>('/proposals'),
    enabled: Boolean(api.token),
  });

  const proposals = proposalsQuery.data?.data ?? [];
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("all");
  const isTokenMissing = !api.token;

  useEffect(() => {
    const termo = new URLSearchParams(window.location.search).get("search");
    if (termo) {
      setBusca(termo);
    }
  }, []);

  const propostasVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return proposals.filter((proposal) => {
      if (statusFiltro !== "all" && proposal.status !== statusFiltro) {
        return false;
      }
      if (!termo) {
        return true;
      }
      const cliente = proposal.client?.name ?? "";
      const titulo = proposal.title ?? "";
      const texto = `${cliente} ${titulo}`.toLowerCase();
      return texto.includes(termo);
    });
  }, [busca, proposals, statusFiltro]);

  let mensagemVazia = t("filters.empty");
  if (proposals.length === 0) {
    mensagemVazia = t("table.empty");
  }

  const opcoesStatus = [
    { id: "all", rotulo: t("filters.all") },
    { id: "DRAFT", rotulo: tStatus("DRAFT") },
    { id: "SENT", rotulo: tStatus("SENT") },
    { id: "ACCEPTED", rotulo: tStatus("ACCEPTED") },
    { id: "DECLINED", rotulo: tStatus("DECLINED") },
    { id: "EXPIRED", rotulo: tStatus("EXPIRED") },
  ];
  const loadError = proposalsQuery.error as Error | null;

  const formatDate = (proposal: ProposalSummary) =>
    format.dateTime(new Date(proposal.createdAt), {
      dateStyle: 'long',
    });

  const handleCopyLink = (proposal: ProposalSummary) => {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    navigator.clipboard.writeText(`${window.location.origin}/p/${proposal.publicSlug}`).catch(() => {});
  };

  const linkPublicoDisponivel = (proposal: ProposalSummary) => {
    if (!proposal.publicSlug) {
      return false;
    }
    return proposal.status !== 'DRAFT' && proposal.status !== 'PENDING';
  };

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          {t("alerts.missingToken")}
        </Card>
      ) : null}

      <PageHeader
        title={t("header.title")}
        description={t("header.description")}
        action={
          temPermissao('proposals', 'edit') && (
            <Button variant="primary" className="w-full sm:w-auto" asChild>
              <Link href="/proposals/new">{t("actions.create")}</Link>
            </Button>
          )
        }
      />

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t("alerts.loadError", { message: loadError.message })}
        </Card>
      ) : null}

      <FilterBar
        busca={busca}
        placeholder={t("filters.search")}
        aoBuscar={setBusca}
        opcoes={opcoesStatus}
        opcaoAtiva={statusFiltro}
        aoEscolher={setStatusFiltro}
        aoLimpar={() => {
          setBusca("");
          setStatusFiltro("all");
        }}
        rotuloLimpar={t("filters.clear")}
      />

      <Card className="overflow-hidden rounded-xl border-outline bg-white p-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px] table-auto text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-6 py-4 text-left font-medium">{t("table.headers.client")}</th>
                <th className="px-6 py-4 text-left font-medium">{t("table.headers.title")}</th>
                <th className="px-6 py-4 text-left font-medium">{t("table.headers.createdAt")}</th>
                <th className="px-6 py-4 text-left font-medium">{t("table.headers.status")}</th>
                <th className="px-6 py-4 text-right font-medium">{t("table.headers.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {proposalsQuery.isLoading ? (
                <tr className="border-t border-outline/60">
                  <td colSpan={5} className="px-6 py-5 text-center text-muted">
                    {t("table.loading")}
                  </td>
                </tr>
              ) : propostasVisiveis.length === 0 ? (
                <tr className="border-t border-outline/60">
                  <td colSpan={5} className="px-6 py-10 text-center text-muted">
                    {mensagemVazia}
                  </td>
                </tr>
              ) : (
                propostasVisiveis.map((proposal) => {
                  const tone = STATUS_TONES[proposal.status] ?? 'neutral';
                  const statusLabel = tStatus(proposal.status);
                  return (
                    <tr
                      key={proposal.id}
                      className="border-t border-outline/60 transition hover:bg-surface/40"
                    >
                      <td className="px-6 py-5 text-ink">
                        {proposal.client?.name ?? t("table.noClient")}
                      </td>
                      <td className="px-6 py-5 text-muted">
                        {proposal.title ?? proposal.template?.name ?? t("table.noTitle")}
                      </td>
                      <td className="px-6 py-5 text-muted">{formatDate(proposal)}</td>
                      <td className="px-6 py-5">
                        <Badge tone={tone}>{statusLabel}</Badge>
                      </td>
                      <td className="px-6 py-5 text-right text-sm font-medium text-primary">
                        <div className="inline-flex items-center gap-3">
                          <Link
                            href={`/proposals/${proposal.publicSlug ?? proposal.id}`}
                            className="hover:underline"
                          >
                            {t("table.view")}
                          </Link>
                          {linkPublicoDisponivel(proposal) && (
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => handleCopyLink(proposal)}
                            >
                              {t("table.copyLink")}
                            </button>
                          )}
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
