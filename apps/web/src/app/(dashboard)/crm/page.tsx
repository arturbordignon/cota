"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { DotsSixVertical, Plus, X } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lead {
  id: string;
  company: string;
  contact: string;
  value: string;
  notes: string;
  email?: string;
  phone?: string;
  proposals?: { id: string; title: string; status: string; amount: string }[];
}

interface Column {
  id: string;
  title: string;
  color: "info" | "warning" | "success" | "neutral";
  leads: Lead[];
}

const initialColumns: Column[] = [
  {
    id: "discovery",
    title: "Descoberta",
    color: "info",
    leads: [
      {
        id: "lead-1",
        company: "Construtora Atlas",
        contact: "Mariana Lima",
        value: "R$ 85 mil",
        notes: "Reunião agendada para sexta-feira",
        email: "mariana@atlas.com",
        phone: "+55 (11) 99745-1212",
        proposals: [],
      },
      {
        id: "lead-2",
        company: "Porto Leste",
        contact: "Rodrigo Santos",
        value: "R$ 120 mil",
        notes: "Aguardando escopo detalhado do pátio",
        email: "rodrigo@portoleste.com",
        phone: "+55 (13) 98890-5534",
        proposals: [],
      },
    ],
  },
  {
    id: "qualification",
    title: "Qualificação",
    color: "warning",
    leads: [
      {
        id: "lead-3",
        company: "Terraplanagem Horizonte",
        contact: "Priscila Mendes",
        value: "R$ 210 mil",
        notes: "Revisando cronograma e número de equipes",
        email: "priscila@horizonte.com",
        phone: "+55 (41) 98765-2244",
        proposals: [
          { id: "P-1022", title: "Terraplanagem fase 1", status: "Rascunho", amount: "R$ 210 mil" },
        ],
      },
    ],
  },
  {
    id: "proposal",
    title: "Proposta enviada",
    color: "info",
    leads: [
      {
        id: "lead-4",
        company: "Industrial Metal Forte",
        contact: "Henrique Alves",
        value: "R$ 330 mil",
        notes: "Proposta enviada via plataforma",
        email: "henrique@metalforte.com",
        phone: "+55 (31) 99650-8899",
        proposals: [
          { id: "P-1050", title: "Guindaste 80t - Projeto A", status: "Enviada", amount: "R$ 210 mil" },
          { id: "P-1051", title: "Guindaste 120t - Projeto B", status: "Enviada", amount: "R$ 120 mil" },
        ],
      },
    ],
  },
  {
    id: "won",
    title: "Fechado",
    color: "success",
    leads: [
      {
        id: "lead-5",
        company: "Logística Integrada",
        contact: "Ana Moreira",
        value: "R$ 95 mil",
        notes: "Contrato assinado - mobilização em 20 dias",
        email: "ana@logintegrada.com",
        phone: "+55 (21) 98333-5544",
        proposals: [
          { id: "P-1001", title: "Guindaste telescópico 60t", status: "Aceita", amount: "R$ 95 mil" },
        ],
      },
    ],
  },
];

export default function CrmBoardPage() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [dragging, setDragging] = useState<{ columnId: string; leadId: string } | null>(null);
  const [activeLead, setActiveLead] = useState<{ lead: Lead; stage: string } | null>(null);

  const totals = useMemo(() => {
    return columns.reduce(
      (acc, column) => {
        acc.leads += column.leads.length;
        acc.value += column.leads.reduce((sum, lead) => sum + parseInt(lead.value.replace(/[^\d]/g, ""), 10), 0);
        return acc;
      },
      { leads: 0, value: 0 }
    );
  }, [columns]);

  const handleDragStart = (columnId: string, leadId: string) => {
    setDragging({ columnId, leadId });
  };

  const handleDrop = (targetColumnId: string) => {
    if (!dragging || dragging.columnId === targetColumnId) return;

    setColumns((prev) => {
      const next = prev.map((column) => ({ ...column, leads: [...column.leads] }));
      const sourceColumn = next.find((column) => column.id === dragging.columnId);
      const destinationColumn = next.find((column) => column.id === targetColumnId);

      if (!sourceColumn || !destinationColumn) return prev;

      const leadIndex = sourceColumn.leads.findIndex((lead) => lead.id === dragging.leadId);
      if (leadIndex === -1) return prev;

      const [lead] = sourceColumn.leads.splice(leadIndex, 1);
      destinationColumn.leads.unshift(lead);

      return next;
    });

    setDragging(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Pipeline de vendas"
        description="Organize prospects em etapas, arraste oportunidades entre colunas e visualize detalhes completos de cada cliente."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button className="w-full sm:w-auto">
              <Plus size={16} className="mr-2" /> Novo lead
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              Personalizar etapas
            </Button>
          </div>
        }
      />

      <Card className="flex flex-wrap items-center gap-4 border border-outline/50 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Oportunidades</p>
          <p className="text-lg font-semibold text-ink">{totals.leads}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Valor potencial</p>
          <p className="text-lg font-semibold text-primary">R$ {Math.round(totals.value / 1000)}k</p>
        </div>
        <p className="text-xs text-muted">
          Arraste e solte cards para movimentar leads entre etapas. Em breve, etapas personalizadas serão salvas por workspace.
        </p>
      </Card>

      <ScrollArea className="w-full" type="always">
        <div className="flex gap-6 pb-6">
          {columns.map((column) => (
            <Card
              key={column.id}
              className="flex w-[320px] flex-shrink-0 flex-col gap-5 border border-outline/60 bg-white p-4 shadow-sm"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone={column.color}>{column.title}</Badge>
                  <span className="text-xs text-muted">{column.leads.length} leads</span>
                </div>
                <DotsSixVertical size={16} className="text-muted" />
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {column.leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    draggable
                    onDragStart={() => handleDragStart(column.id, lead.id)}
                    onClick={() => setActiveLead({ lead, stage: column.title })}
                    className="rounded-xl border border-outline/50 bg-[var(--color-surface-muted)]/80 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-ink">{lead.company}</h3>
                        <p className="text-xs text-muted">{lead.contact}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary">{lead.value}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted">{lead.notes}</p>
                  </button>
                ))}

                {column.leads.length === 0 && (
                  <div className="rounded-xl border border-dashed border-outline/60 bg-white/70 p-4 text-center text-xs text-muted">
                    Arraste leads para esta etapa
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Dialog.Root open={!!activeLead} onOpenChange={() => setActiveLead(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-y-0 right-0 w-full max-w-lg border-l border-outline/60 bg-white shadow-2xl">
            {activeLead ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-outline/60 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-base font-semibold text-ink">
                      {activeLead.lead.company}
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-muted">
                      Etapa atual: {activeLead.stage}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-full border border-outline bg-[var(--color-surface-muted)] p-2 text-muted"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-ink">Contato principal</h3>
                    <div className="rounded-lg border border-outline/60 bg-white p-4 text-sm text-muted">
                      <p>{activeLead.lead.contact}</p>
                      {activeLead.lead.email ? <p>{activeLead.lead.email}</p> : null}
                      {activeLead.lead.phone ? <p>{activeLead.lead.phone}</p> : null}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-ink">Oportunidade</h3>
                    <div className="rounded-lg border border-outline/60 bg-white p-4 text-sm text-muted">
                      <p>Valor estimado: <span className="font-semibold text-primary">{activeLead.lead.value}</span></p>
                      <p className="mt-2 text-xs text-muted">Notas recentes</p>
                      <p>{activeLead.lead.notes}</p>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-ink">Propostas relacionadas</h3>
                      <Button variant="ghost" size="sm">
                        Gerar nova proposta
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {(activeLead.lead.proposals ?? []).map((proposal) => (
                        <div
                          key={proposal.id}
                          className="rounded-lg border border-outline/60 bg-[var(--color-surface-muted)]/80 px-4 py-3 text-sm text-ink"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{proposal.title}</span>
                            <Badge tone={proposal.status === "Aceita" ? "success" : "info"}>{proposal.status}</Badge>
                          </div>
                          <p className="text-xs text-muted">{proposal.amount}</p>
                        </div>
                      ))}
                      {(!activeLead.lead.proposals || activeLead.lead.proposals.length === 0) && (
                        <div className="rounded-lg border border-dashed border-outline/60 bg-white/70 px-4 py-6 text-center text-xs text-muted">
                          Ainda não existem propostas ligadas a este lead
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="border-t border-outline/60 px-6 py-4">
                  <Button className="w-full" variant="primary">
                    Atualizar estágio
                  </Button>
                </div>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
