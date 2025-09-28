"use client";

import { useFormatter } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { EquipmentResponse, EquipmentSummary } from "@/types/api";

function formatServiceDetails(equipment: EquipmentSummary) {
  const details: string[] = [];

  if (equipment.capacityTons != null) {
    details.push(`Capacidade: ${equipment.capacityTons} t`);
  }

  const specs = (equipment.specsJson as Record<string, unknown> | null) ?? {};

  const description = typeof specs['description'] === "string" ? (specs['description'] as string) : null;
  if (description && description.trim().length > 0) {
    details.push(description.trim());
  }

  const notes = typeof specs['notes'] === "string" ? (specs['notes'] as string) : null;
  if (notes && notes.trim().length > 0) {
    details.push(notes.trim());
  }

  return details.join(" • ") || "Sem detalhes adicionais";
}

export default function ServicesPage() {
  const api = useApi();
  const format = useFormatter();

  const equipmentQuery = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.get<EquipmentResponse>('/equipment'),
    enabled: Boolean(api.token),
  });

  const services = (equipmentQuery.data?.data ?? []) as EquipmentSummary[];
  const isTokenMissing = !api.token;
  const loadError = equipmentQuery.error as Error | null;

  const formatCurrency = (dailyRate?: string | null) => {
    if (!dailyRate) return null;
    const value = Number(dailyRate);
    if (Number.isNaN(value)) return null;
    return format.number(value, {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  };

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para visualizar o catálogo real.
        </Card>
      ) : null}

      <PageHeader
        title="Catálogo de serviços"
        description="Organize equipamentos, pacotes e valores para montar propostas consistentes."
        action={<Button className="w-full sm:w-auto" disabled> Novo serviço</Button>}
      />

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          Não foi possível carregar os serviços: {loadError.message}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {equipmentQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={`service-skeleton-${index}`}
              className="h-36 animate-pulse rounded-3xl border border-outline/40 bg-white/70"
            />
          ))
        ) : services.length > 0 ? (
          services.map((service) => {
            const formattedRate = formatCurrency(service.dailyRate);
            return (
              <Card key={service.id} className="space-y-3 rounded-3xl border border-outline/60 bg-white p-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-ink">{service.name}</h3>
                  {formattedRate ? (
                    <span className="text-sm font-semibold text-primary">{formattedRate} / dia</span>
                  ) : null}
                </div>
                <p className="text-sm text-muted">{formatServiceDetails(service)}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" disabled>
                    Duplicar
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-outline bg-white/90 px-10 py-16 text-center text-muted">
            <span className="font-medium text-ink">Nenhum serviço cadastrado ainda.</span>
            <p className="text-sm">
              Adicione seus equipamentos e pacotes principais para reutilizar os valores nas propostas.
            </p>
          </Card>
        )}
      </div>
    </section>
  );
}
