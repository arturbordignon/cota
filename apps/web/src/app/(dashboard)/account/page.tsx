"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { CompanyForm } from "@/components/account/company-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PortalButton } from "@/components/billing/checkout-button";
import { PlanUsageSnapshot } from "@/components/billing/plan-usage";
import { useCurrentUser } from "@/components/providers/user-provider";

export default function AccountPage() {
  const { user, signOut, status } = useCurrentUser();
  const t = useTranslations("account.page");

  if (status === "loading") {
    return (
      <section className="space-y-6">
        <Card className="rounded-3xl border border-outline/60 bg-white px-6 py-6 text-sm text-muted">
          {t("loading")}
        </Card>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <Card className="rounded-3xl border border-warning/40 bg-warning-soft px-6 py-6 text-sm text-warning">
          {t("signInPrompt")}
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title={t("header.title")}
        description={t("header.description")}
        action={
          <Button variant="outline" onClick={() => signOut()} className="w-full sm:w-auto">
            {t("actions.signOut")}
          </Button>
        }
      />

      <CompanyForm />

      <PlanUsageSnapshot />

      <Card className="flex flex-col gap-5 rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-ink">{t("upsell.title")}</h2>
          <p className="text-sm text-muted">{t("upsell.description")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/plans">Ver planos</Link>
          </Button>
          <PortalButton label={t("upsell.cta")} variant="outline" className="w-full sm:w-auto" />
        </div>
      </Card>
    </section>
  );
}
