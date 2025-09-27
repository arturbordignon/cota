import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const mockClients = [
  {
    name: "Construtora Horizonte",
    contact: "comercial@horizonte.com",
    phone: "+55 (11) 99876-2345",
    projects: 12,
  },
  {
    name: "Indústria Metal Forte",
    contact: "compras@metalforte.com.br",
    phone: "+55 (31) 91234-8877",
    projects: 8,
  },
  {
    name: "Logística Integrada",
    contact: "operacoes@logintegrada.com",
    phone: "+55 (21) 97521-4566",
    projects: 5,
  },
];

export default function ClientsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Centralize dados fiscais, limites de crédito e histórico de propostas para negociar com mais confiança."
        action={<Button className="w-full sm:w-auto">Adicionar cliente</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {mockClients.map((client) => (
          <Card key={client.name} className="flex flex-col gap-3 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">{client.name}</h3>
              <Badge tone="info">{client.projects} propostas</Badge>
            </div>
            <div className="space-y-1 text-sm text-muted">
              <p>{client.contact}</p>
              <p>{client.phone}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Ver detalhes
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
