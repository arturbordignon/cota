"use client";

import { useQuery } from "@tanstack/react-query";
import { Check } from "@phosphor-icons/react";

import { CheckoutButton } from "@/components/billing/checkout-button";
import { PageHeader } from "@/components/layout/page-header";
import { useCurrentUser } from "@/components/providers/user-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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

      {plansQuery.isError && <Notice tone="danger">Não foi possível carregar os planos.</Notice>}

      {plansQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-60 rounded-xl" />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {planos.map((plano) => {
          const atual = plano.slug === planoAtual;
          return (
            <Card
              key={plano.id}
              className={cn(
                "relative flex flex-col p-6",
                atual && "border-primary ring-[3px] ring-primary/20",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-sans text-[15px] font-semibold text-ink">{plano.name}</h2>
                {atual && <Badge tone="brand">Plano atual</Badge>}
              </div>
              <p className="tabular mt-4 font-display text-[30px] font-semibold leading-none text-ink">
                {formatarPreco(plano)}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
                <Check size={14} weight="bold" className="shrink-0 text-success" />
                {descreverLimite(plano)}
              </p>
              <div className="mt-auto pt-6">
                <CheckoutButton
                  planSlug={plano.slug}
                  label={atual ? "Plano atual" : "Contratar"}
                  variant={atual ? "secondary" : "primary"}
                  className="w-full"
                  disabled={!podeContratar || atual}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
