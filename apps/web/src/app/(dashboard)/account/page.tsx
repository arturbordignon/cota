"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SignOut } from "@phosphor-icons/react";

import { CompanyForm } from "@/components/account/company-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalButton } from "@/components/billing/checkout-button";
import { PlanUsageSnapshot } from "@/components/billing/plan-usage";
import { useCurrentUser } from "@/components/providers/user-provider";

export default function AccountPage() {
  const { user, signOut, status } = useCurrentUser();
  const t = useTranslations("account.page");
  const tNav = useTranslations("navigation");

  if (status === "loading") {
    return (
      <section className="space-y-6">
        <Skeleton className="h-64 rounded-xl" />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <Notice tone="warning">{t("signInPrompt")}</Notice>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title={t("header.title")}
        description={t("header.description")}
        action={
          <Button variant="secondary" onClick={() => signOut()}>
            <SignOut size={16} />
            {t("actions.signOut")}
          </Button>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <CompanyForm />

        <div className="space-y-6">
          <PlanUsageSnapshot />

          <Card className="p-5">
            <CardTitle>{t("upsell.title")}</CardTitle>
            <CardDescription>{t("upsell.description")}</CardDescription>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/plans">{tNav("usage.plans")}</Link>
              </Button>
              <PortalButton label={t("upsell.cta")} variant="secondary" />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
