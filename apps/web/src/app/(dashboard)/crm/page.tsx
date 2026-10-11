"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, DotsSixVertical, PaintBrushBroad, Plus, Trash } from "@phosphor-icons/react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

const STAGE_DOT: Record<StageColor, string> = {
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  neutral: 'bg-outline',
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
      <PageHeader
        title={t('header.title')}
        description={t('header.description')}
        action={
          <>
            <Button
              variant="secondary"
              disabled={!isAdmin}
              onClick={() => setCustomizeDialogOpen(true)}
            >
              <PaintBrushBroad size={16} /> {t('actions.customizeStages')}
            </Button>
            <Button disabled={!isAdmin || columns.length === 0} onClick={() => setCreateDialogOpen(true)}>
              <Plus size={16} weight="bold" /> {t('actions.newLead')}
            </Button>
          </>
        }
      />

      {isTokenMissing ? <Notice tone="warning">{t('alerts.missingToken')}</Notice> : null}

      {loadError && !isTokenMissing ? (
        <Notice tone="danger">{t('alerts.loadError', { message: loadError.message })}</Notice>
      ) : null}

      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <div>
          <p className="meta-label">{t('summary.leads')}</p>
          <p className="tabular font-display text-[28px] font-semibold leading-tight text-ink">{totals.leads}</p>
        </div>
        <div>
          <p className="meta-label">{t('summary.value')}</p>
          <p className="tabular font-display text-[28px] font-semibold leading-tight text-ink">
            {formatCurrency(totals.value) ?? 'R$ 0'}
          </p>
        </div>
        <p className="pb-1.5 text-[13px] text-muted">
          {!isAdmin ? t('overview.viewOnly') : t('overview.dragHint')}
        </p>
      </div>

      {pipelineQuery.isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`pipeline-skeleton-${index}`} className="h-80 w-[300px] shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <ScrollArea className="w-full" type="always">
          <div className="flex items-start gap-4 pb-5">
            {columns.map((column) => {
              const isDropTarget = Boolean(dragging && dragging.columnId !== column.id);
              const columnValue = column.leads.reduce((acc, lead) => {
                const numeric = lead.estimatedValue ? Number(lead.estimatedValue) : 0;
                return acc + (Number.isNaN(numeric) ? 0 : numeric);
              }, 0);

              return (
                <div
                  key={column.id}
                  className={cn(
                    'flex w-[300px] shrink-0 flex-col rounded-xl border border-transparent bg-surface-muted p-2 transition-colors',
                    isDropTarget && 'border-dashed border-primary bg-primary-tint',
                  )}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(column.id)}
                >
                  <div className="flex items-center justify-between gap-2 px-2 pb-3 pt-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STAGE_DOT[column.color])} />
                      <h3 className="truncate font-sans text-sm font-semibold text-ink">{column.title}</h3>
                      <span className="tabular rounded-full bg-white px-2 text-xs font-semibold text-muted ring-1 ring-border">
                        {column.leads.length}
                      </span>
                    </div>
                    {columnValue > 0 ? (
                      <span className="tabular shrink-0 text-xs font-semibold text-muted">{formatCurrency(columnValue)}</span>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {column.leads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable={isAdmin}
                        onDragStart={() => handleDragStart(column.id, lead.id)}
                        onClick={() => setActiveLead({ lead, stage: column.title })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setActiveLead({ lead, stage: column.title });
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          'group rounded-lg border border-border bg-white p-3.5 shadow-card transition-[border-color,box-shadow] hover:border-outline hover:shadow-[0_4px_12px_-6px_rgb(27_31_36/0.18)]',
                          isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{lead.companyName}</p>
                            {lead.contactName ? <p className="truncate text-xs text-muted">{lead.contactName}</p> : null}
                          </div>
                          {isAdmin ? (
                            <DotsSixVertical size={16} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                          ) : null}
                        </div>
                        {lead.estimatedValue ? (
                          <p className="tabular mt-3 text-sm font-semibold text-ink">{formatCurrency(lead.estimatedValue)}</p>
                        ) : null}
                      </div>
                    ))}
                    {column.leads.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-outline px-4 py-6 text-center text-xs text-muted">
                        Nenhum lead nesta etapa.
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <Modal
        open={Boolean(activeLead)}
        onOpenChange={(open) => !open && setActiveLead(null)}
        title={activeLead?.lead.companyName ?? ''}
        description={activeLead ? `Etapa: ${activeLead.stage}` : undefined}
        size="sm"
      >
        {activeLead ? (
          <ModalBody>
            <dl className="divide-y divide-border rounded-lg border border-border text-sm">
              {[
                { rotulo: 'Contato', valor: activeLead.lead.contactName },
                { rotulo: 'E-mail', valor: activeLead.lead.contactEmail },
                { rotulo: 'Telefone', valor: activeLead.lead.contactPhone },
                { rotulo: 'Valor estimado', valor: formatCurrency(activeLead.lead.estimatedValue) },
              ]
                .filter((item) => item.valor)
                .map((item) => (
                  <div key={item.rotulo} className="flex justify-between gap-4 px-3.5 py-2.5">
                    <dt className="text-muted">{item.rotulo}</dt>
                    <dd className="truncate text-right font-medium text-ink">{item.valor}</dd>
                  </div>
                ))}
            </dl>
            {activeLead.lead.notes ? (
              <div>
                <p className="meta-label">Notas</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{activeLead.lead.notes}</p>
              </div>
            ) : null}
          </ModalBody>
        ) : null}
      </Modal>

      <Modal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Novo lead"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.companyName || !draft.stageId || createLeadMutation.isPending) return;
          createLeadMutation.mutate();
        }}
      >
        <ModalBody>
          <Field label="Empresa" htmlFor="lead-company">
            <Input
              id="lead-company"
              autoFocus
              value={draft.companyName}
              onChange={(event) => setDraft((prev) => ({ ...prev, companyName: event.target.value }))}
              placeholder="Nome da empresa"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contato" htmlFor="lead-contact">
              <Input
                id="lead-contact"
                value={draft.contactName}
                onChange={(event) => setDraft((prev) => ({ ...prev, contactName: event.target.value }))}
                placeholder="Nome do contato"
              />
            </Field>
            <Field label="E-mail" htmlFor="lead-email">
              <Input
                id="lead-email"
                value={draft.contactEmail}
                onChange={(event) => setDraft((prev) => ({ ...prev, contactEmail: event.target.value }))}
                placeholder="contato@empresa.com"
                type="email"
              />
            </Field>
            <Field label="Telefone" htmlFor="lead-phone">
              <Input
                id="lead-phone"
                value={draft.contactPhone}
                onChange={(event) => setDraft((prev) => ({ ...prev, contactPhone: event.target.value }))}
                placeholder="+55 (11) 99999-0000"
              />
            </Field>
            <Field label="Valor estimado (R$)" htmlFor="lead-value">
              <Input
                id="lead-value"
                inputMode="decimal"
                value={draft.estimatedValue}
                onChange={(event) => setDraft((prev) => ({ ...prev, estimatedValue: event.target.value }))}
                placeholder="120000"
              />
            </Field>
          </div>
          <Field label="Etapa" htmlFor="lead-stage">
            {columns.length > 0 ? (
              <Select
                id="lead-stage"
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
          </Field>
          <Field label="Notas" htmlFor="lead-notes">
            <Textarea
              id="lead-notes"
              rows={3}
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder={t('forms.notesPlaceholder')}
            />
          </Field>
          {createLeadMutation.isError ? (
            <Notice tone="danger">{(createLeadMutation.error as Error).message}</Notice>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <ModalClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </ModalClose>
          <Button
            type="submit"
            disabled={!draft.companyName || !draft.stageId}
            loading={createLeadMutation.isPending}
            loadingText="Salvando..."
          >
            Salvar lead
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        open={customizeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCustomizeError(null);
            setNewStageName('');
            setNewStageColor('info');
          }
          setCustomizeDialogOpen(open);
        }}
        size="lg"
        title="Personalizar etapas"
        description="Renomeie, reordene ou ajuste as cores das etapas do pipeline. Remova apenas etapas sem leads."
      >
        <ModalBody>
          {customizeError ? <Notice tone="danger">{customizeError}</Notice> : null}

          {stageEdits.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline px-4 py-8 text-center text-sm text-muted">
              Nenhuma etapa cadastrada ainda. Adicione uma nova etapa abaixo.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {stageEdits.map((stage, index) => (
                <li key={stage.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-center">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STAGE_DOT[stage.color])} />
                    <Input
                      aria-label="Nome da etapa"
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
                  <Select
                    aria-label="Cor"
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
                  <div className="flex items-center justify-between gap-1 sm:justify-end">
                    <span className="tabular mr-2 text-xs text-muted">
                      {stage.leadCount} {stage.leadCount === 1 ? 'lead' : 'leads'}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleReorderStage(stage.id, -1)}
                        disabled={index === 0 || reorderingStages}
                        aria-label="Mover para cima"
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleReorderStage(stage.id, 1)}
                        disabled={index === stageEdits.length - 1 || reorderingStages}
                        aria-label="Mover para baixo"
                      >
                        <ArrowDown size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteStage(stage)}
                        disabled={deletingStageId === stage.id || stage.leadCount > 0}
                        aria-label="Excluir etapa"
                        title={
                          stage.leadCount > 0
                            ? 'Remova os leads desta etapa antes de excluir.'
                            : 'Excluir etapa'
                        }
                        className="hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-lg border border-dashed border-outline p-3">
            <p className="mb-2 text-[13px] font-semibold text-ink">Nova etapa</p>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
              <Input
                aria-label="Nome da nova etapa"
                value={newStageName}
                onChange={(event) => setNewStageName(event.target.value)}
                placeholder="Ex.: Follow-up"
                disabled={createStageMutation.isPending}
              />
              <Select
                aria-label="Cor da nova etapa"
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
              <Button
                variant="secondary"
                onClick={handleCreateStage}
                loading={createStageMutation.isPending}
                loadingText="Adicionando..."
              >
                <Plus size={14} weight="bold" />
                Adicionar
              </Button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="secondary">Concluir</Button>
          </ModalClose>
        </ModalFooter>
      </Modal>
    </section>
  );
}
