import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckoutButton, PortalButton } from "@/components/billing/checkout-button";
import { PlanUsageSnapshot } from "@/components/billing/plan-usage";

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

export default function PlansPage() {
  return (
    <section className="space-y-10">
      <PageHeader
        title="Planos & faturamento"
        description="Selecione um plano alinhado ao volume de propostas da sua operação. Pagamentos processados via Stripe com faturamento local em BRL e USD."
      />

      <PlanUsageSnapshot />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Planos Brasil</h2>
          <Badge tone="info">Cobrança Stripe · BRL</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {brPlans.map((plan) => (
            <Card key={plan.id} className="flex flex-col gap-4 border border-outline/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
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
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">US Plans</h2>
          <Badge tone="info">Stripe Billing · USD</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {usPlans.map((plan) => (
            <Card key={plan.id} className="flex flex-col gap-4 border border-outline/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
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
      </div>

      <Card className="space-y-3 rounded-3xl border border-outline/60 bg-[var(--color-surface-muted)]/80 px-6 py-5 text-sm text-muted">
        <p>
          Em produção, cada plano será configurado como produto/price no Stripe. A API receberá a moeda do workspace (BRL ou USD) para estimar impostos locais antes de criar a sessão de checkout. É possível ativar faturamento pró-rata ao trocar de plano no meio do ciclo.
        </p>
        <PortalButton label="Abrir portal de cobrança" variant="outline" className="w-full sm:w-auto" />
      </Card>
    </section>
  );
}
