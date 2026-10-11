"use client";

import { useQuery } from "@tanstack/react-query";

import { CheckoutButton } from "@/components/billing/checkout-button";
import { PageHeader } from "@/components/layout/page-header";
import { useCurrentUser } from "@/components/providers/user-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import type { BillingOverviewResponse, PlanSummary, PlansResponse } from "@/types/api";

function buscarMoeda(overview: BillingOverviewResponse | undefined, locale: string | null | undefined) {
  if (overview?.data.plan?.currency) {
    return overview.data.plan.currency;
  }
  if (locale === "en") {
    return "USD";
  }
  return "BRL";
}

function formatarPreco(plano: PlanSummary) {
  const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: plano.currency }).format(
    plano.amountCents / 100,
  );
  if (plano.isAnnual) {
    return `${valor} / ano`;
  }
  return `${valor} / mês`;
}

function descreverLimite(plano: PlanSummary) {
  if (plano.isUnlimited) {
    return "Propostas ilimitadas";
  }
  return `${plano.proposalsPerMonth} propostas por mês`;
}

export default function PlansPage() {
  const api = useApi();
  const { user, temPermissao } = useCurrentUser();
  const podeContratar = temPermissao("plan", "edit");

  const plansQuery = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => api.get<PlansResponse>("/billing/plans"),
    enabled: api.isAuthenticated,
  });

  const overviewQuery = useQuery({
    queryKey: ["billing", "overview"],
    queryFn: () => api.get<BillingOverviewResponse>("/billing/overview"),
    enabled: api.isAuthenticated,
  });

  const moeda = buscarMoeda(overviewQuery.data, user?.locale);
  const planoAtual = overviewQuery.data?.data.plan?.slug;
  const planos = (plansQuery.data?.data || []).filter((plano) => plano.currency === moeda);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Planos"
        description="Escolha o plano ideal para o volume de propostas da sua empresa."
      />

      {plansQuery.isError && (
        <Card className="rounded-3xl border border-danger/30 bg-danger-soft/40 px-6 py-6 text-sm text-danger">
          Não foi possível carregar os planos.
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {planos.map((plano) => (
          <Card key={plano.id} className="flex flex-col gap-4 rounded-3xl border border-outline/60 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              {plano.slug === planoAtual && <Badge tone="success">Plano atual</Badge>}
              <h2 className="text-lg font-semibold text-ink">{plano.name}</h2>
              <p className="text-2xl font-semibold text-primary">{formatarPreco(plano)}</p>
              <p className="text-sm text-muted">{descreverLimite(plano)}</p>
            </div>
            <div className="mt-auto">
              <CheckoutButton
                planSlug={plano.slug}
                label="Contratar"
                className="w-full"
                disabled={!podeContratar || plano.slug === planoAtual}
              />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
