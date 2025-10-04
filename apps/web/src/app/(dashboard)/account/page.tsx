"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PortalButton } from "@/components/billing/checkout-button";
import { PlanUsageSnapshot } from "@/components/billing/plan-usage";
import { useCurrentUser } from "@/components/providers/user-provider";

export default function AccountPage() {
  const { user, signOut, status } = useCurrentUser();

  if (status === "loading") {
    return (
      <section className="space-y-6">
        <Card className="rounded-3xl border border-outline/60 bg-white px-6 py-6 text-sm text-muted">
          Carregando dados da conta...
        </Card>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <Card className="rounded-3xl border border-warning/40 bg-warning-soft px-6 py-6 text-sm text-warning">
          Faça login novamente para visualizar as informações da conta.
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title="Minha Conta"
        description="Veja o status atual da assinatura e faça upgrade quando precisar."
        action={
          <Button variant="outline" onClick={() => signOut()} className="w-full sm:w-auto">
            Encerrar sessão
          </Button>
        }
      />

      <PlanUsageSnapshot />

      <Card className="flex flex-col gap-5 rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-ink">Precisa de mais propostas?</h2>
          <p className="text-sm text-muted">
            Faça upgrade do seu plano a qualquer momento e libere limites maiores para a sua equipe.
          </p>
        </div>
        <PortalButton label="Upgrade de plano" className="w-full sm:w-auto" />
      </Card>
    </section>
  );
}
