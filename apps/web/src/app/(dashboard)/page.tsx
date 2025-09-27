import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tActions = await getTranslations("actions");

  const metrics = [
  {
    label: 'Propostas enviadas no mês',
    value: '28',
    delta: '+12%',
  },
  {
    label: 'Taxa de aceite',
    value: '67%',
    delta: '+5% vs. mês anterior',
  },
  {
    label: 'Tempo médio de geração',
    value: '6 min',
    delta: '-2 min',
  },
];

const quickActions = [
    {
      title: tActions("createProposal"),
      href: "/proposals/new",
      description: "Monte uma proposta completa com fotos e totais.",
    },
    {
      title: tActions("addClient"),
      href: "/clients/new",
      description: "Salve dados fiscais e contatos para autofill.",
    },
    {
      title: tActions("createTemplate"),
      href: "/templates/new",
      description: "Personalize layouts com campos obrigatórios.",
    },
  ];

  return (
    <section className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="rounded-3xl border border-outline/50 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{metric.value}</p>
            <p className="text-xs text-success">{metric.delta}</p>
            {metric.progress !== undefined && metric.total ? (
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${(metric.progress / metric.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
      <PageHeader
        title="Painel de Controle"
        description="Visão rápida dos créditos e atalhos principais para movimentar o funil de propostas."
      />
      <Card className="flex flex-col gap-6 rounded-3xl border-none bg-gradient-to-br from-primary-soft to-white px-6 py-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted">{t("credits")}</p>
          <p className="font-display text-4xl font-semibold text-ink">100</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/plans">{"Comprar Créditos"}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/plans">{"Atualizar Plano"}</Link>
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-ink">{t("quickAccess")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((item) => (
            <Card key={item.href} className="group flex flex-col justify-between gap-3 rounded-2xl border border-outline/60 bg-white px-6 py-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div>
                <div className="text-base font-semibold text-ink">{item.title}</div>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </div>
              <Link
                className="inline-flex items-center text-sm font-medium text-primary transition-colors group-hover:text-ink"
                href={item.href}
              >
                {"Ir agora"}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
