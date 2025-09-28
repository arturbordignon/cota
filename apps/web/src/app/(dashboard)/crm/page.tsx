"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DotsSixVertical, Plus, X } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectItem } from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import {
  PipelineLeadSummary,
  PipelineStagesResponse,
  ProspectsResponse,
} from "@/types/api";

interface ColumnState {
  id: string;
  title: string;
  color: "info" | "warning" | "success" | "neutral";
  leads: PipelineLeadSummary[];
}

interface NewLeadDraft {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  stageId: string;
  estimatedValue: string;
  notes: string;
  prospectId?: string;
}

function mapColor(color: string): "info" | "warning" | "success" | "neutral" {
  switch (color) {
    case "warning":
    case "success":
    case "info":
      return color;
    default:
      return "neutral";
  }
}

function formatCurrency(value?: string | null) {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return numeric.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  });
}

export default function CrmBoardPage() {
  const { isAdmin } = useCurrentUser();
  const api = useApi();
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<ColumnState[]>([]);
  const [dragging, setDragging] = useState<{ columnId: string; leadId: string } | null>(null);
  const [activeLead, setActiveLead] = useState<{ lead: PipelineLeadSummary; stage: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [draft, setDraft] = useState<NewLeadDraft>({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    stageId: '',
    estimatedValue: '',
    notes: '',
  });

  const pipelineQuery = useQuery({
    queryKey: ['pipeline', 'stages'],
    queryFn: () => api.get<PipelineStagesResponse>('/pipeline/stages'),
    enabled: Boolean(api.token),
  });

  const prospectsQuery = useQuery({
    queryKey: ['prospects', 'lookup'],
    queryFn: () => api.get<ProspectsResponse>('/prospects?limit=200'),
    enabled: Boolean(api.token),
  });

  useEffect(() => {
    if (pipelineQuery.data) {
      const mapped: ColumnState[] = pipelineQuery.data.data.map((stage) => ({
        id: stage.id,
        title: stage.name,
        color: mapColor(stage.color),
        leads: stage.leads ?? [],
      }));
      setColumns(mapped);
      setDraft((prev) => {
        if (prev.stageId || mapped.length === 0) {
          return prev;
        }
        return { ...prev, stageId: mapped[0].id };
      });
    }
  }, [pipelineQuery.data]);

  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      await api.patch(`/pipeline/leads/${leadId}/move`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/pipeline/leads', {
        stageId: draft.stageId,
        companyName: draft.companyName.trim(),
        contactName: draft.contactName.trim() || undefined,
        contactEmail: draft.contactEmail.trim() || undefined,
        contactPhone: draft.contactPhone.trim() || undefined,
        estimatedValue: draft.estimatedValue ? Number(draft.estimatedValue.replace(/[^0-9.,]/g, '').replace(',', '.')) : undefined,
        notes: draft.notes.trim() || undefined,
        prospectId: draft.prospectId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
      setCreateDialogOpen(false);
      setDraft((prev) => ({ ...prev, companyName: '', contactName: '', contactEmail: '', contactPhone: '', estimatedValue: '', notes: '' }));
    },
  });

  const totals = useMemo(() => {
    const leadCount = columns.reduce((sum, column) => sum + column.leads.length, 0);
    const value = columns.reduce((sum, column) => {
      return sum + column.leads.reduce((acc, lead) => {
        const numeric = lead.estimatedValue ? Number(lead.estimatedValue) : 0;
        return acc + (Number.isNaN(numeric) ? 0 : numeric);
      }, 0);
    }, 0);
    return { leads: leadCount, value };
  }, [columns]);

  const handleDragStart = (columnId: string, leadId: string) => {
    if (!isAdmin) return;
    setDragging({ columnId, leadId });
  };

  const handleDrop = (targetColumnId: string) => {
    if (!isAdmin || !dragging || dragging.columnId === targetColumnId) return;
    setColumns((prev) => {
      const next = prev.map((column) => ({ ...column, leads: [...column.leads] }));
      const sourceColumn = next.find((column) => column.id === dragging.columnId);
      const destinationColumn = next.find((column) => column.id === targetColumnId);
      if (!sourceColumn || !destinationColumn) return prev;
      const leadIndex = sourceColumn.leads.findIndex((lead) => lead.id === dragging.leadId);
      if (leadIndex === -1) return prev;
      const [lead] = sourceColumn.leads.splice(leadIndex, 1);
      destinationColumn.leads.unshift(lead);
      moveLeadMutation.mutate({ leadId: lead.id, stageId: targetColumnId });
      return next;
    });
    setDragging(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isAdmin) return;
    event.preventDefault();
  };

  const isTokenMissing = !api.token;
  const loadError = pipelineQuery.error as Error | null;

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Defina a variável `NEXT_PUBLIC_API_TOKEN` ou autentique-se para visualizar o pipeline real.
        </Card>
      ) : null}

      <PageHeader
        title="Pipeline de vendas"
        description="Organize prospects em etapas, mova oportunidades entre colunas e acompanhe o potencial de receita por fase."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button className="w-full sm:w-auto" disabled={!isAdmin} onClick={() => setCreateDialogOpen(true)}>
              <Plus size={16} className="mr-2" /> Novo lead
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" disabled>
              Personalizar etapas
            </Button>
          </div>
        }
      />

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          Não foi possível carregar o pipeline: {loadError.message}
        </Card>
      ) : null}

      <Card className="flex flex-wrap items-center gap-4 border border-outline/50 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Oportunidades</p>
          <p className="text-lg font-semibold text-ink">{totals.leads}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Valor potencial</p>
          <p className="text-lg font-semibold text-primary">{formatCurrency(String(totals.value)) ?? 'R$ 0'}</p>
        </div>
        {!isAdmin ? (
          <p className="text-xs text-muted">
            Você possui acesso de visualização. Solicite permissões de edição para movimentar etapas ou criar novos leads.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Arraste e solte cards para movimentar leads entre etapas. Etapas personalizadas serão salvas por workspace em uma próxima atualização.
          </p>
        )}
      </Card>

      {pipelineQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card
              key={`pipeline-skeleton-${index}`}
              className="h-64 animate-pulse rounded-3xl border border-outline/40 bg-white/70"
            />
          ))}
        </div>
      ) : (
        <ScrollArea className="w-full" type="always">
          <div className="flex gap-6 pb-6">
            {columns.map((column) => (
              <Card
                key={column.id}
                className="flex w-80 flex-col gap-4 border border-outline/40 bg-white p-4 shadow-sm"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{column.title}</h3>
                    <p className="text-xs text-muted">{column.leads.length} leads</p>
                  </div>
                  <Badge tone={column.color}>{column.color.toUpperCase()}</Badge>
                </div>
                <div className="space-y-3">
                  {column.leads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={isAdmin}
                      onDragStart={() => handleDragStart(column.id, lead.id)}
                      className="group cursor-grab rounded-2xl border border-outline/60 bg-[var(--color-surface-muted)]/70 p-4 transition hover:border-primary"
                    >
                      <div className="flex items-start justify-between gap-2"
                        onClick={() => setActiveLead({ lead, stage: column.title })}
                        role="button"
                        tabIndex={0}
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink">{lead.companyName}</p>
                          {lead.contactName ? <p className="text-xs text-muted">{lead.contactName}</p> : null}
                          {lead.contactEmail ? <p className="text-xs text-muted">{lead.contactEmail}</p> : null}
                        </div>
                        <DotsSixVertical size={16} className="text-muted opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span>{formatCurrency(lead.estimatedValue)}</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-xs text-primary"
                          onClick={() => setActiveLead({ lead, stage: column.title })}
                        >
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                  {column.leads.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-outline/50 bg-white/80 px-4 py-6 text-center text-xs text-muted">
                      Nenhum lead nesta etapa.
                    </p>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog.Root open={Boolean(activeLead)} onOpenChange={(open) => !open && setActiveLead(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
            {activeLead ? (
              <Card className="w-full max-w-xl space-y-4 border border-outline/50 bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{activeLead.lead.companyName}</h2>
                    <p className="text-xs text-muted">Etapa: {activeLead.stage}</p>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Fechar"
                      className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="grid gap-3 text-sm text-muted">
                  {activeLead.lead.contactName ? <p>Contato: {activeLead.lead.contactName}</p> : null}
                  {activeLead.lead.contactEmail ? <p>E-mail: {activeLead.lead.contactEmail}</p> : null}
                  {activeLead.lead.contactPhone ? <p>Telefone: {activeLead.lead.contactPhone}</p> : null}
                  {activeLead.lead.estimatedValue ? (
                    <p>Valor estimado: {formatCurrency(activeLead.lead.estimatedValue)}</p>
                  ) : null}
                  {activeLead.lead.notes ? <p>Notas: {activeLead.lead.notes}</p> : null}
                  {activeLead.lead.prospect ? (
                    <p>Prospect: {activeLead.lead.prospect.name}</p>
                  ) : null}
                </div>
              </Card>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
            <Card className="w-full max-w-xl space-y-4 border border-outline/50 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold text-ink">Novo lead</Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Fechar"
                    className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </Dialog.Close>
              </div>
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label>Empresa</Label>
                  <Input
                    value={draft.companyName}
                    onChange={(event) => setDraft((prev) => ({ ...prev, companyName: event.target.value }))}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Contato</Label>
                    <Input
                      value={draft.contactName}
                      onChange={(event) => setDraft((prev) => ({ ...prev, contactName: event.target.value }))}
                      placeholder="Nome do contato"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input
                      value={draft.contactEmail}
                      onChange={(event) => setDraft((prev) => ({ ...prev, contactEmail: event.target.value }))}
                      placeholder="contato@empresa.com"
                      type="email"
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input
                      value={draft.contactPhone}
                      onChange={(event) => setDraft((prev) => ({ ...prev, contactPhone: event.target.value }))}
                      placeholder="+55 (11) 99999-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Valor estimado (R$)</Label>
                    <Input
                      value={draft.estimatedValue}
                      onChange={(event) => setDraft((prev) => ({ ...prev, estimatedValue: event.target.value }))}
                      placeholder="120000"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Notas</Label>
                  <Input
                    value={draft.notes}
                    onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Resumo do projeto, próximas ações..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Prospect vinculado</Label>
                  <Select
                    value={draft.prospectId ?? ''}
                    onValueChange={(value) => setDraft((prev) => ({ ...prev, prospectId: value || undefined }))}
                  >
                    <SelectItem value="">Nenhum</SelectItem>
                    {(prospectsQuery.data?.data ?? []).map((prospect) => (
                      <SelectItem key={prospect.id} value={prospect.id}>
                        {prospect.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Etapa</Label>
                  <Select value={draft.stageId} onValueChange={(value) => setDraft((prev) => ({ ...prev, stageId: value }))}>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.title}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="ghost">Cancelar</Button>
                </Dialog.Close>
                <Button onClick={() => createLeadMutation.mutate()} disabled={!draft.companyName || !draft.stageId}>
                  {createLeadMutation.isPending ? 'Salvando...' : 'Salvar lead'}
                </Button>
              </div>
            </Card>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
