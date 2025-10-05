'use client';

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
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
  const format = useFormatter();
  const t = useTranslations("proposals.page");
  const tStatus = useTranslations("proposals.status");

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
          {t("alerts.missingToken")}
        </Card>
      ) : null}

      <PageHeader
        title={t("header.title")}
        description={t("header.description")}
        action={
          <Button variant="primary" className="w-full sm:w-auto" asChild>
            <Link href="/proposals/new">{t("actions.create")}</Link>
          </Button>
        }
      />

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t("alerts.loadError", { message: loadError.message })}
        </Card>
      ) : null}

      <Card className="rounded-3xl border-outline bg-white/90 p-0">
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
              ) : proposals.length === 0 ? (
                <tr className="border-t border-outline/60">
                  <td colSpan={5} className="px-6 py-10 text-center text-muted">
                    {t("table.empty")}
                  </td>
                </tr>
              ) : (
                proposals.map((proposal) => {
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
                          <Link href={`/proposals/${proposal.id}`} className="hover:underline">
                            {t("table.view")}
                          </Link>
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => handleCopyLink(proposal.id)}
                          >
                            {t("table.copyLink")}
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
