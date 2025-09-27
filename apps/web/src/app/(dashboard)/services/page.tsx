import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const mockServices = [
  {
    name: "Guindaste telescópico 60t",
    rate: "R$ 6.500 / dia",
    details: "Inclui operador, combustível e deslocamento em raio de 60 km.",
  },
  {
    name: "Plataforma elevatória 20m",
    rate: "R$ 2.300 / dia",
    details: "Montagem, check-list de segurança e inspeção pré-obra.",
  },
];

export default function ServicesPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Catálogo de serviços"
        description="Organize equipamentos, pacotes e valores para montar propostas consistentes."
        action={<Button className="w-full sm:w-auto">Novo serviço</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {mockServices.map((service) => (
          <Card key={service.name} className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">{service.name}</h3>
              <span className="text-sm font-semibold text-primary">{service.rate}</span>
            </div>
            <p className="text-sm text-muted">{service.details}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Editar</Button>
              <Button variant="ghost" size="sm">Duplicar</Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
