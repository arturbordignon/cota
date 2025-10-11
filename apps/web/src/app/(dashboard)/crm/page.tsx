"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, DotsSixVertical, PaintBrushBroad, Plus, X } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { PipelineLeadSummary, PipelineStagesResponse } from "@/types/api";
import { cn } from "@/lib/utils";

interface ColumnState {
  id: string;
  title: string;
  color: "info" | "warning" | "success" | "neutral";
  leads: PipelineLeadSummary[];
}

type StageColor = ColumnState["color"];

interface NewLeadDraft {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  stageId: string;
  estimatedValue: string;
  notes: string;
}

interface StageEditor {
  id: string;
  name: string;
  color: StageColor;
  leadCount: number;
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

function formatCurrency(value?: string | number | null) {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return null;
  return numeric.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  });
}

const STAGE_COLORS: StageColor[] = ['info', 'warning', 'success', 'neutral'];

const COLUMN_HEADER_STYLES: Record<StageColor, string> = {
  info: 'border-[var(--color-info)]/20 bg-[var(--color-info-soft)] text-[var(--color-info)]',
  warning: 'border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  success: 'border-[var(--color-success)]/20 bg-[var(--color-success-soft)] text-[var(--color-success)]',
  neutral: 'border-outline/40 bg-[var(--color-surface-muted)] text-ink',
};

export default function CrmBoardPage() {
  const { isAdmin } = useCurrentUser();
  const t = useTranslations("crm.page");
  const api = useApi();
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<ColumnState[]>([]);
  const [dragging, setDragging] = useState<{ columnId: string; leadId: string } | null>(null);
  const [activeLead, setActiveLead] = useState<{ lead: PipelineLeadSummary; stage: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [stageEdits, setStageEdits] = useState<StageEditor[]>([]);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState<StageColor>('info');
  const [customizeError, setCustomizeError] = useState<string | null>(null);
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);
  const [reorderingStages, setReorderingStages] = useState(false);
  const [draft, setDraft] = useState<NewLeadDraft>({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    stageId: '',
    estimatedValue: '',
    notes: '',
  });

  const stageColorOptions = useMemo(
    () => STAGE_COLORS.map((value) => ({ value, label: t(`stageColors.${value}`) })),
    [t],
  );

  const pipelineQuery = useQuery({
    queryKey: ['pipeline', 'stages'],
    queryFn: () => api.get<PipelineStagesResponse>('/pipeline/stages'),
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

  useEffect(() => {
    if (!createDialogOpen || draft.stageId || columns.length === 0) {
      return;
    }
    setDraft((prev) => ({ ...prev, stageId: columns[0].id }));
  }, [createDialogOpen, columns, draft.stageId]);

  useEffect(() => {
    if (!customizeDialogOpen) return;
    setCustomizeError(null);
    setStageEdits(
      columns.map((column) => ({
        id: column.id,
        name: column.title,
        color: column.color,
        leadCount: column.leads.length,
      })),
    );
  }, [customizeDialogOpen, columns]);

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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
      setCreateDialogOpen(false);
      setDraft((prev) => ({ ...prev, companyName: '', contactName: '', contactEmail: '', contactPhone: '', estimatedValue: '', notes: '' }));
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<{ name: string; color: StageColor }> }) =>
      api.patch(`/pipeline/stages/${id}`, payload),
    onMutate: ({ id }) => {
      setUpdatingStageId(id);
      setCustomizeError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
    },
    onError: (error) => {
      setCustomizeError(error instanceof Error ? error.message : t('errors.updateStage'));
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
    },
    onSettled: () => {
      setUpdatingStageId(null);
    },
  });

  const reorderStagesMutation = useMutation({
    mutationFn: (order: StageEditor[]) =>
      api.patch('/pipeline/stages/reorder', {
        stages: order.map((stage) => ({ id: stage.id })),
      }),
    onMutate: () => {
      setReorderingStages(true);
      setCustomizeError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
    },
    onError: (error) => {
      setCustomizeError(error instanceof Error ? error.message : t('errors.reorderStages'));
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
    },
    onSettled: () => {
      setReorderingStages(false);
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: (id: string) => api.del(`/pipeline/stages/${id}`),
    onMutate: (id) => {
      setDeletingStageId(id);
      setCustomizeError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
    },
    onError: (error) => {
      setCustomizeError(error instanceof Error ? error.message : t('errors.deleteStage'));
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
    },
    onSettled: () => {
      setDeletingStageId(null);
    },
  });

  const createStageMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: StageColor }) =>
      api.post('/pipeline/stages', { name, color }),
    onMutate: () => {
      setCustomizeError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stages'] });
      setNewStageName('');
      setNewStageColor('info');
    },
    onError: (error) => {
      setCustomizeError(error instanceof Error ? error.message : t('errors.createStage'));
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

  const handleStageNameInput = (id: string, value: string) => {
    setStageEdits((prev) => prev.map((stage) => (stage.id === id ? { ...stage, name: value } : stage)));
  };

  const handleStageNameCommit = (id: string) => {
    const stage = stageEdits.find((item) => item.id === id);
    const original = columns.find((item) => item.id === id);
    if (!stage || !original) return;

    const trimmed = stage.name.trim();
    if (trimmed.length < 2) {
      setCustomizeError('O nome da etapa precisa ter pelo menos 2 caracteres.');
      setStageEdits((prev) =>
        prev.map((item) => (item.id === id ? { ...item, name: original.title } : item)),
      );
      return;
    }

    if (trimmed === original.title) {
      return;
    }

    setStageEdits((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: trimmed } : item)),
    );

    updateStageMutation.mutate({ id, payload: { name: trimmed } });
  };

  const handleStageColorChange = (id: string, color: StageColor) => {
    setStageEdits((prev) => prev.map((stage) => (stage.id === id ? { ...stage, color } : stage)));
    const original = columns.find((item) => item.id === id);
    if (original && original.color !== color) {
      updateStageMutation.mutate({ id, payload: { color } });
    }
  };

  const handleReorderStage = (id: string, direction: -1 | 1) => {
    setStageEdits((prev) => {
      const index = prev.findIndex((stage) => stage.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const previous = [...prev];
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      reorderStagesMutation.mutate(next, {
        onError: () => setStageEdits([...previous]),
      });
      return next;
    });
  };

  const handleDeleteStage = (stage: StageEditor) => {
    if (stage.leadCount > 0) {
      setCustomizeError(t('errors.deleteStageBlocked'));
      return;
    }
    deleteStageMutation.mutate(stage.id);
  };

  const handleCreateStage = () => {
    const trimmed = newStageName.trim();
    if (trimmed.length < 2) {
      setCustomizeError(t('errors.invalidStageName'));
      return;
    }
    createStageMutation.mutate({ name: trimmed, color: newStageColor });
  };

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
          {t('alerts.missingToken')}
        </Card>
      ) : null}

      <PageHeader
        title={t('header.title')}
        description={t('header.description')}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              disabled={!isAdmin || columns.length === 0}
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus size={16} className="mr-2" /> {t('actions.newLead')}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={!isAdmin}
              onClick={() => setCustomizeDialogOpen(true)}
            >
              <PaintBrushBroad size={16} className="mr-2" /> {t('actions.customizeStages')}
            </Button>
          </div>
        }
      />

      {loadError && !isTokenMissing ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t('alerts.loadError', { message: loadError.message })}
        </Card>
      ) : null}

      <Card className="flex flex-wrap items-center gap-4 border border-outline/50 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{t('summary.leads')}</p>
          <p className="text-lg font-semibold text-ink">{totals.leads}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{t('summary.value')}</p>
          <p className="text-lg font-semibold text-primary">{formatCurrency(totals.value) ?? 'R$ 0'}</p>
        </div>
        {!isAdmin ? (
          <p className="text-xs text-muted">
            {t('overview.viewOnly')}
          </p>
        ) : (
          <p className="text-xs text-muted">
            {t('overview.dragHint')}
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
            {columns.map((column) => {
              const isDropTarget = Boolean(dragging && dragging.columnId !== column.id);
              const headerClass = COLUMN_HEADER_STYLES[column.color];

              return (
                <Card
                  key={column.id}
                  className={cn(
                    'flex w-80 flex-col gap-4 border border-outline/40 bg-white p-4 shadow-sm transition',
                    isDropTarget && 'border-primary/40 bg-primary-soft/40',
                  )}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(column.id)}
                >
                  <div className={cn('rounded-xl border px-4 py-3', headerClass)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{column.title}</h3>
                        <p className="text-xs text-muted">{column.leads.length} {column.leads.length === 1 ? 'lead' : 'leads'}</p>
                      </div>
                      <Badge tone={column.color}>{column.color === 'neutral' ? 'NEUTRAL' : column.color.toUpperCase()}</Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {column.leads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable={isAdmin}
                        onDragStart={() => handleDragStart(column.id, lead.id)}
                        className="group cursor-grab rounded-2xl border border-outline/60 bg-[var(--color-surface-muted)]/70 p-4 transition hover:border-primary"
                      >
                        <div
                          className="flex items-start justify-between gap-2"
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
              );
            })}
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
                  <Textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder={t('forms.notesPlaceholder')}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Etapa</Label>
                  {columns.length > 0 ? (
                    <Select
                      value={draft.stageId}
                      onValueChange={(value) => setDraft((prev) => ({ ...prev, stageId: value }))}
                    >
                      {columns.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.title}
                        </SelectItem>
                      ))}
                    </Select>
                  ) : (
                    <p className="text-sm text-muted">Crie uma etapa antes de adicionar leads.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="ghost">Cancelar</Button>
                </Dialog.Close>
                <Button
                  onClick={() => createLeadMutation.mutate()}
                  disabled={!draft.companyName || !draft.stageId || createLeadMutation.isPending}
                >
                  {createLeadMutation.isPending ? 'Salvando...' : 'Salvar lead'}
                </Button>
              </div>
            </Card>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={customizeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCustomizeError(null);
            setNewStageName('');
            setNewStageColor('info');
          }
          setCustomizeDialogOpen(open);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10 md:items-center">
            <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-6 border border-outline/50 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-ink">Personalizar etapas</Dialog.Title>
                  <Dialog.Description className="text-xs text-muted">
                    Renomeie, reordene ou ajuste as cores das etapas do pipeline. Remova apenas etapas sem leads.
                  </Dialog.Description>
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

              {customizeError ? (
                <p className="rounded-lg border border-danger/40 bg-danger-soft/20 px-3 py-2 text-sm text-danger">
                  {customizeError}
                </p>
              ) : null}

              <div className="space-y-3">
                {stageEdits.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-outline/40 bg-[var(--color-surface-muted)]/30 px-4 py-8 text-center text-sm text-muted">
                    Nenhuma etapa cadastrada ainda. Adicione uma nova etapa abaixo.
                  </p>
                ) : null}
                {stageEdits.map((stage, index) => (
                  <div key={stage.id} className="rounded-xl border border-outline/40 bg-[var(--color-surface-muted)]/40 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted">Nome da etapa</Label>
                        <Input
                          value={stage.name}
                          onChange={(event) => handleStageNameInput(stage.id, event.target.value)}
                          onBlur={() => handleStageNameCommit(stage.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleStageNameCommit(stage.id);
                            }
                          }}
                          disabled={updatingStageId === stage.id}
                        />
                      </div>
                      <div className="flex flex-col gap-2 md:w-48">
                        <Label className="text-xs uppercase tracking-wide text-muted">Cor</Label>
                        <Select
                          value={stage.color}
                          onValueChange={(value) => handleStageColorChange(stage.id, value as StageColor)}
                          disabled={updatingStageId === stage.id}
                        >
                          {stageColorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <Badge tone={stage.color}>{stage.leadCount} {stage.leadCount === 1 ? 'lead' : 'leads'}</Badge>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorderStage(stage.id, -1)}
                          disabled={index === 0 || reorderingStages}
                          aria-label="Mover para cima"
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReorderStage(stage.id, 1)}
                          disabled={index === stageEdits.length - 1 || reorderingStages}
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteStage(stage)}
                          disabled={deletingStageId === stage.id || stage.leadCount > 0}
                          title={
                            stage.leadCount > 0
                              ? 'Remova os leads desta etapa antes de excluir.'
                              : undefined
                          }
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-dashed border-outline/40 bg-[var(--color-surface-muted)]/30 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted">Nova etapa</Label>
                    <Input
                      value={newStageName}
                      onChange={(event) => setNewStageName(event.target.value)}
                      placeholder="Ex.: Follow-up"
                      disabled={createStageMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted">Cor</Label>
                    <Select
                      value={newStageColor}
                      onValueChange={(value) => setNewStageColor(value as StageColor)}
                      disabled={createStageMutation.isPending}
                    >
                      {stageColorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button onClick={handleCreateStage} disabled={createStageMutation.isPending}>
                    {createStageMutation.isPending ? 'Adicionando...' : 'Adicionar etapa'}
                  </Button>
                </div>
              </div>
            </Card>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
