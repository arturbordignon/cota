"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutButton, PortalButton } from "@/components/billing/checkout-button";
import { PlanUsageSnapshot } from "@/components/billing/plan-usage";
import { useCurrentUser } from "@/components/providers/user-provider";

const brPlans = [
  { id: "br-50", title: "Plano Essencial", proposals: "50 propostas/mês", price: "R$ 49,90", billing: "Cobrado mensalmente" },
  { id: "br-100", title: "Plano Profissional", proposals: "100 propostas/mês", price: "R$ 89,90", billing: "Cobrado mensalmente" },
  { id: "br-unlimited", title: "Plano Ilimitado", proposals: "Propostas ilimitadas", price: "R$ 149,00", billing: "Cobrado mensalmente" },
  { id: "br-unlimited-year", title: "Plano Ilimitado Anual", proposals: "Propostas ilimitadas", price: "R$ 1.200,00", billing: "Cobrado anualmente" },
];

const usPlans = [
  { id: "us-50", title: "Essential", proposals: "50 proposals / month", price: "$15", billing: "Billed monthly" },
  { id: "us-100", title: "Professional", proposals: "100 proposals / month", price: "$30", billing: "Billed monthly" },
  { id: "us-unlimited", title: "Unlimited", proposals: "Unlimited proposals", price: "$100", billing: "Billed monthly" },
  { id: "us-unlimited-year", title: "Unlimited Annual", proposals: "Unlimited proposals", price: "$900", billing: "Billed annually" },
];

const roleLabels: Record<string, { label: string; tone: "success" | "warning" | "info" | "neutral" }> = {
  owner: { label: "Proprietário", tone: "success" },
  admin: { label: "Administrador", tone: "info" },
  manager: { label: "Gestor", tone: "warning" },
  viewer: { label: "Somente leitura", tone: "neutral" },
};

export default function AccountPage() {
  const router = useRouter();
  const { user, updateUser } = useCurrentUser();

  const roleMeta = useMemo(() => roleLabels[user.role] ?? roleLabels.viewer, [user.role]);

  const handleSignOut = () => {
    updateUser({ token: undefined });
    router.push("/sign-in");
  };

  return (
    <section className="space-y-10">
      <PageHeader
        title="Minha Conta"
        description="Gerencie os dados do seu usuário, preferências do workspace e acompanhe o status da assinatura."
        action={
          <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
            Encerrar sessão
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5 rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Informações pessoais</h2>
              <p className="text-sm text-muted">Esses dados ficam visíveis para a sua equipe e nos relatórios.</p>
            </div>
            <Badge tone={roleMeta.tone} className="capitalize">
              {roleMeta.label}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted">Nome completo</span>
              <p className="text-sm font-medium text-ink">{user.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted">E-mail corporativo</span>
              <p className="text-sm font-medium text-ink">{user.email}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted">Departamento</span>
              <p className="text-sm font-medium text-ink">{user.department}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted">Identificador</span>
              <p className="text-sm font-medium text-ink">{user.id}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-5 rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink">Sessão e segurança</h2>
            <p className="text-sm text-muted">Utilize o token de API apenas em ambientes confiáveis. Revogue o acesso caso compartilhe este dispositivo.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-muted">Token atual</span>
              <p className="break-all rounded-lg border border-dashed border-outline/60 bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-muted">
                {user.token ?? "Não vinculado"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={() => updateUser({ token: process.env.NEXT_PUBLIC_API_TOKEN })}>
                Atualizar token
              </Button>
              <Button variant="ghost" size="sm" onClick={() => updateUser({ token: undefined })}>
                Revogar token local
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <PlanUsageSnapshot />

      <Card className="space-y-4 rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Planos Brasil</h2>
            <p className="text-sm text-muted">Escolha um plano em reais alinhado ao volume da sua operação.</p>
          </div>
          <Badge tone="info">Stripe · BRL</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {brPlans.map((plan) => (
            <Card
              key={plan.id}
              className="flex h-full flex-col gap-4 border border-outline/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-ink">{plan.title}</h3>
                <p className="text-sm text-muted">{plan.proposals}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary">{plan.price}</p>
                <p className="text-xs text-muted">{plan.billing}</p>
              </div>
              <CheckoutButton planSlug={plan.id} label="Selecionar" className="mt-auto w-full" />
            </Card>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 rounded-3xl border border-outline/60 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">US Plans</h2>
            <p className="text-sm text-muted">Assinaturas em dólar para equipes fora do Brasil.</p>
          </div>
          <Badge tone="info">Stripe · USD</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {usPlans.map((plan) => (
            <Card
              key={plan.id}
              className="flex h-full flex-col gap-4 border border-outline/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-ink">{plan.title}</h3>
                <p className="text-sm text-muted">{plan.proposals}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary">{plan.price}</p>
                <p className="text-xs text-muted">{plan.billing}</p>
              </div>
              <CheckoutButton planSlug={plan.id} label="Choose plan" className="mt-auto w-full" variant="secondary" />
            </Card>
          ))}
        </div>

        <div className="rounded-3xl border border-outline/60 bg-[var(--color-surface-muted)]/80 px-6 py-5 text-sm text-muted">
          <p className="mb-3">
            Em produção, cada plano será configurado como produto/price no Stripe. A API detecta a moeda do workspace para aplicar impostos locais e permitir upgrades pró-rata.
          </p>
          <PortalButton label="Abrir portal de cobrança" variant="outline" className="w-full sm:w-auto" />
        </div>
      </Card>
    </section>
  );
}
