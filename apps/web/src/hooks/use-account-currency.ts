"use client";

import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/components/providers/user-provider";
import { useApi } from "@/hooks/use-api";
import type { BillingOverviewResponse } from "@/types/api";

// Money is shown in the currency the account is billed in (its plan), not in
// the language of the screen: a Brazilian company reading in English still
// quotes in reais.
export function useAccountCurrency(): string {
  const api = useApi();
  const { user } = useCurrentUser();
  const overviewQuery = useQuery({
    queryKey: ["billing", "overview"],
    queryFn: () => api.get<BillingOverviewResponse>("/billing/overview"),
    enabled: api.isAuthenticated,
  });

  const moedaDoPlano = overviewQuery.data?.data.plan?.currency;
  if (moedaDoPlano) {
    return moedaDoPlano;
  }
  return user?.account.locale === "en" ? "USD" : "BRL";
}
