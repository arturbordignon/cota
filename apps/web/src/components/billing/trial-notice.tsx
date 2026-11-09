"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useApi } from "@/hooks/use-api";
import type { BillingOverviewResponse } from "@/types/api";

const UM_DIA = 24 * 60 * 60 * 1000;

// Shown while the account is on the free trial: how long is left, or that it
// ended and new proposals need a plan. Proposals already sent keep working.
export function TrialNotice({ showPlansLink = false }: { showPlansLink?: boolean }) {
  const api = useApi();
  const t = useTranslations("billing.trial");
  const format = useFormatter();
  const overviewQuery = useQuery({
    queryKey: ["billing", "overview"],
    queryFn: () => api.get<BillingOverviewResponse>("/billing/overview"),
    enabled: api.isAuthenticated,
  });

  const trial = overviewQuery.data?.data.trial;
  if (!trial) {
    return null;
  }

  const acao = showPlansLink ? (
    <Button asChild size="sm">
      <Link href="/plans">{t("cta")}</Link>
    </Button>
  ) : undefined;

  if (trial.ended || !trial.endsAt) {
    return (
      <Notice tone="warning" title={t("endedTitle")} action={acao}>
        {t("ended")}
      </Notice>
    );
  }

  const fim = new Date(trial.endsAt);
  const dias = Math.max(1, Math.ceil((fim.getTime() - Date.now()) / UM_DIA));
  return (
    <Notice tone="info" title={t("activeTitle", { count: dias })} action={acao}>
      {t("active", { date: format.dateTime(fim, { day: "2-digit", month: "2-digit", year: "numeric" }) })}
    </Notice>
  );
}
