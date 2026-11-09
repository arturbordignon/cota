"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Check } from "@phosphor-icons/react";

import { CheckoutButton } from "@/components/billing/checkout-button";
import { TrialNotice } from "@/components/billing/trial-notice";
import { PageHeader } from "@/components/layout/page-header";
import { useCurrentUser } from "@/components/providers/user-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import type { BillingOverviewResponse, PlanSummary, PlansResponse } from "@/types/api";

type Ciclo = "monthly" | "annual";

function buscarMoeda(overview: BillingOverviewResponse | undefined, locale: string | null | undefined) {
  if (overview?.data.plan?.currency) {
    return overview.data.plan.currency;
  }
  if (locale === "en") {
    return "USD";
  }
  return "BRL";
}

export default function PlansPage() {
  const api = useApi();
  const { user, temPermissao } = useCurrentUser();
  const podeContratar = temPermissao("plan", "edit");
  const t = useTranslations("plans");
  const format = useFormatter();
  const [erroCobranca, setErroCobranca] = useState<string | null>(null);
  const [ciclo, setCiclo] = useState<Ciclo>("monthly");

  const formatarValor = (plano: PlanSummary, centavos: number) =>
    format.number(centavos / 100, { style: "currency", currency: plano.currency });

  const formatarPreco = (plano: PlanSummary) => {
    const price = formatarValor(plano, plano.amountCents);
    return plano.isAnnual ? t("perYear", { price }) : t("perMonth", { price });
  };

  const descreverLimite = (plano: PlanSummary) =>
    plano.isUnlimited ? t("unlimited") : t("limit", { count: plano.proposalsPerMonth ?? 0 });

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

  const planoAtualDados = overviewQuery.data?.data.plan;
  const moeda = buscarMoeda(overviewQuery.data, user?.locale);
  const planoAtual = planoAtualDados?.slug;
  const daMoeda = (plansQuery.data?.data || []).filter((plano) => plano.currency === moeda);
  const temAnuais = daMoeda.some((plano) => plano.isAnnual);
  const planos = daMoeda.filter((plano) => plano.isAnnual === (ciclo === "annual"));

  // Someone already on an annual plan lands on the annual prices.
  useEffect(() => {
    if (planoAtualDados?.isAnnual) {
      setCiclo("annual");
    }
  }, [planoAtualDados?.isAnnual]);

  return (
    <section className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          temAnuais ? (
            <Segmented<Ciclo>
              ariaLabel={t("cycle.label")}
              value={ciclo}
              onChange={setCiclo}
              options={[
                { value: "monthly", label: t("cycle.monthly") },
                { value: "annual", label: t("cycle.annual") },
              ]}
            />
          ) : null
        }
      />

      <TrialNotice />
      {plansQuery.isError && <Notice tone="danger">{t("loadError")}</Notice>}
      {erroCobranca && <Notice tone="danger">{erroCobranca}</Notice>}
      {!podeContratar && <Notice tone="info">{t("noPermission")}</Notice>}

      {plansQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, indice) => (
            <Skeleton key={indice} className="h-60 rounded-xl" />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                {atual ? (
                  <Badge tone="brand">{t("current")}</Badge>
                ) : plano.isAnnual ? (
                  <Badge tone="success">{t("cycle.saving")}</Badge>
                ) : null}
              </div>
              <p className="tabular mt-4 font-display text-[30px] font-semibold leading-none text-ink">
                {formatarPreco(plano)}
              </p>
              {plano.isAnnual ? (
                <p className="tabular mt-2 text-xs text-muted">
                  {t("cycle.perMonthEquivalent", { price: formatarValor(plano, Math.round(plano.amountCents / 12)) })}
                </p>
              ) : null}
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
                <Check size={14} weight="bold" className="shrink-0 text-success" />
                {descreverLimite(plano)}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                <Check size={14} weight="bold" className="shrink-0 text-success" />
                {t("everything")}
              </p>
              <div className="mt-auto pt-6">
                <CheckoutButton
                  planSlug={plano.slug}
                  label={atual ? t("current") : t("subscribe")}
                  variant={atual ? "secondary" : "primary"}
                  className="w-full"
                  disabled={!podeContratar || atual}
                  onClick={() => setErroCobranca(null)}
                  onFailure={setErroCobranca}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
