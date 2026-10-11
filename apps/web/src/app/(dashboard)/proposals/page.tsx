'use client';

import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Check, LinkSimple, Plus } from "@phosphor-icons/react";

import { FilterBar } from "@/components/layout/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { useCurrentUser } from "@/components/providers/user-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
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

  const [linkCopiado, setLinkCopiado] = useState<string | null>(null);

  const handleCopyLink = (proposal: ProposalSummary) => {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    navigator.clipboard
      .writeText(`${window.location.origin}/p/${proposal.publicSlug}`)
      .then(() => {
        setLinkCopiado(proposal.id);
        window.setTimeout(() => setLinkCopiado((atual) => (atual === proposal.id ? null : atual)), 2000);
      })
      .catch(() => {});
  };

  const linkPublicoDisponivel = (proposal: ProposalSummary) => {
    if (!proposal.publicSlug) {
      return false;
    }
    return proposal.status !== 'DRAFT' && proposal.status !== 'PENDING';
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("header.title")}
        description={t("header.description")}
        action={
          temPermissao('proposals', 'edit') && (
            <Button variant="primary" asChild>
              <Link href="/proposals/new">
                <Plus size={16} weight="bold" />
                {t("actions.create")}
              </Link>
            </Button>
          )
        }
      />

      {isTokenMissing ? <Notice tone="warning">{t("alerts.missingToken")}</Notice> : null}

      {loadError && !isTokenMissing ? (
        <Notice tone="danger">{t("alerts.loadError", { message: loadError.message })}</Notice>
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

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t("table.headers.client")}</th>
                <th>{t("table.headers.title")}</th>
                <th>{t("table.headers.createdAt")}</th>
                <th>{t("table.headers.status")}</th>
                <th className="text-right">{t("table.headers.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {proposalsQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted">
                    {t("table.loading")}
                  </td>
                </tr>
              ) : propostasVisiveis.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-muted">
                    {mensagemVazia}
                  </td>
                </tr>
              ) : (
                propostasVisiveis.map((proposal) => {
                  const tone = STATUS_TONES[proposal.status] ?? 'neutral';
                  const statusLabel = tStatus(proposal.status);
                  const href = `/proposals/${proposal.publicSlug ?? proposal.id}` as Route;
                  return (
                    <tr key={proposal.id}>
                      <td className="font-semibold text-ink">
                        <Link href={href} className="hover:underline">
                          {proposal.client?.name ?? t("table.noClient")}
                        </Link>
                      </td>
                      <td>{proposal.title ?? proposal.template?.name ?? t("table.noTitle")}</td>
                      <td className="tabular whitespace-nowrap">{formatDate(proposal)}</td>
                      <td>
                        <Badge tone={tone} dot>
                          {statusLabel}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {linkPublicoDisponivel(proposal) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(proposal)}
                            >
                              {linkCopiado === proposal.id ? (
                                <Check size={14} weight="bold" className="text-success" />
                              ) : (
                                <LinkSimple size={14} weight="bold" />
                              )}
                              {linkCopiado === proposal.id ? t("table.linkCopied") : t("table.copyLink")}
                            </Button>
                          )}
                          <Button asChild variant="secondary" size="sm">
                            <Link href={href}>{t("table.view")}</Link>
                          </Button>
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
