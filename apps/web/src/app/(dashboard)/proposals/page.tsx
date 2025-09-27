import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const mockRows = [
  {
    id: "1",
    client: "Empresa de Construção Civil Ltda.",
    createdAt: "15 de Julho de 2024",
    status: { label: "Enviada", tone: "warning" as const },
  },
  {
    id: "2",
    client: "Indústria Metalúrgica S.A.",
    createdAt: "22 de Junho de 2024",
    status: { label: "Visualizada pelo Cliente", tone: "info" as const },
  },
];

export default function ProposalsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Minhas Propostas"
        description="Acompanhe status, gere PDFs e compartilhe links rápidos com seus clientes."
        action={<Button variant="primary" className="w-full sm:w-auto">Criar nova proposta</Button>}
      />

      <Card className="rounded-3xl border-outline bg-white/90 p-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[560px] table-auto text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-6 py-4 text-left font-medium">Cliente</th>
              <th className="px-6 py-4 text-left font-medium">Data de criação</th>
              <th className="px-6 py-4 text-left font-medium">Status</th>
              <th className="px-6 py-4 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {mockRows.map((row) => (
              <tr key={row.id} className="border-t border-outline/60 transition hover:bg-surface/40">
                <td className="px-6 py-5 text-ink">{row.client}</td>
                <td className="px-6 py-5 text-muted">{row.createdAt}</td>
                <td className="px-6 py-5">
                  <Badge tone={row.status.tone}>{row.status.label}</Badge>
                </td>
                <td className="px-6 py-5 text-right text-sm font-medium text-primary">
                  Ver proposta • Copiar link
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
