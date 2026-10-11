"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useFormatter } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { EquipmentResponse, EquipmentSummary } from "@/types/api";

interface ServicePayload {
  name: string;
  capacityTons?: number | null;
  dailyRate?: number | null;
  description?: string | null;
  notes?: string | null;
}

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ServicePayload) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
  title: string;
  description: string;
  submitLabel: string;
  initialValues?: {
    name?: string;
    capacityTons?: number | null;
    dailyRate?: number | null;
    description?: string | null;
    notes?: string | null;
  };
}

function ServiceDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  errorMessage,
  title,
  description,
  submitLabel,
  initialValues,
}: ServiceDialogProps) {
  const [name, setName] = useState<string>("");
  const [capacity, setCapacity] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const resetForm = () => {
    setName(initialValues?.name ?? "");
    setCapacity(
      initialValues?.capacityTons != null && !Number.isNaN(initialValues.capacityTons)
        ? String(initialValues.capacityTons)
        : ""
    );
    setRate(
      initialValues?.dailyRate != null && !Number.isNaN(initialValues.dailyRate)
        ? String(initialValues.dailyRate)
        : ""
    );
    setDetails(initialValues?.description ?? "");
    setNotes(initialValues?.notes ?? "");
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, initialValues?.name, initialValues?.capacityTons, initialValues?.dailyRate, initialValues?.description, initialValues?.notes]);

  const handleClose = (next: boolean) => {
    if (!next) {
      resetForm();
    }
    onOpenChange(next);
  };

  const toNumber = (value: string) => {
    if (!value.trim()) return null;
    const normalized = value.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    const parsedCapacity = toNumber(capacity);
    const parsedRate = toNumber(rate);

    await onSubmit({
      name: name.trim(),
      capacityTons: parsedCapacity ?? undefined,
      dailyRate: parsedRate ?? undefined,
      description: details.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:items-center">
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-xl max-h-[90vh] md:max-h-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-outline/20 px-6 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-ink">{title}</Dialog.Title>
                <Dialog.Description className="text-xs text-muted">{description}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                  aria-label="Fechar"
                >
                  <X size={16} weight="bold" />
                </button>
              </Dialog.Close>
            </header>

            <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="service-name">Nome</Label>
                <Input
                  id="service-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: Guindaste 50t"
                  required
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-capacity">Capacidade (t)</Label>
                  <Input
                    id="service-capacity"
                    inputMode="decimal"
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                    placeholder="Ex.: 50"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-rate">Valor diário (BRL)</Label>
                  <Input
                    id="service-rate"
                    inputMode="decimal"
                    value={rate}
                    onChange={(event) => setRate(event.target.value)}
                    placeholder="Ex.: 2500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-description">Descrição</Label>
                <Textarea
                  id="service-description"
                  rows={3}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Resumo do serviço ou equipamento"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-notes">Observações internas</Label>
                <Textarea
                  id="service-notes"
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Links, restrições ou observações"
                  disabled={isSubmitting}
                />
              </div>
              {errorMessage ? (
                <p className="rounded-lg border border-danger/40 bg-danger-soft/20 px-3 py-2 text-sm text-danger">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <footer className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? 'Salvando…' : submitLabel}
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatServiceDetails(equipment: EquipmentSummary) {
  const details: string[] = [];

  if (equipment.capacityTons != null) {
    details.push(`Capacidade: ${equipment.capacityTons} t`);
  }

  const { description, notes } = extractSpecs(equipment);

  if (description) {
    details.push(description);
  }

  if (notes) {
    details.push(notes);
  }

  return details.join(" • ") || "Sem detalhes adicionais";
}

function extractSpecs(equipment: EquipmentSummary) {
  const specs = (equipment.specsJson as Record<string, unknown> | null) ?? {};
  const description = typeof specs['description'] === "string" ? specs['description'].trim() : null;
  const notes = typeof specs['notes'] === "string" ? specs['notes'].trim() : null;
  return {
    description: description && description.length > 0 ? description : null,
    notes: notes && notes.length > 0 ? notes : null,
  };
}

export default function ServicesPage() {
  const api = useApi();
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<EquipmentSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const equipmentQuery = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.get<EquipmentResponse>('/equipment'),
    enabled: Boolean(api.token),
  });

  const services = useMemo(
    () => ((equipmentQuery.data?.data ?? []) as EquipmentSummary[]),
    [equipmentQuery.data],
  );
  const isTokenMissing = !api.token;
  const loadError = equipmentQuery.error as Error | null;
  const canCreate = Boolean(api.token);

  const createService = useMutation({
    mutationFn: (payload: ServicePayload) =>
      api.post<{ data: EquipmentSummary }>('/equipment', {
        name: payload.name,
        capacityTons: payload.capacityTons ?? undefined,
        dailyRate: payload.dailyRate ?? undefined,
        description: payload.description ?? undefined,
        notes: payload.notes ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setCreateDialogOpen(false);
    },
  });

  const updateService = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServicePayload }) =>
      api.put<{ data: EquipmentSummary }>(`/equipment/${id}`, {
        name: payload.name,
        capacityTons: payload.capacityTons ?? undefined,
        dailyRate: payload.dailyRate ?? undefined,
        description: payload.description ?? undefined,
        notes: payload.notes ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEditingService(null);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => api.del(`/equipment/${id}`),
    onMutate: () => {
      setDeleteError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setDeleteTarget(null);
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : 'Não foi possível remover o serviço.');
    },
  });

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

  const editingInitialValues = useMemo(() => {
    if (!editingService) return undefined;
    const specs = extractSpecs(editingService);
    return {
      name: editingService.name,
      capacityTons: editingService.capacityTons ?? null,
      dailyRate:
        editingService.dailyRate != null && editingService.dailyRate !== ''
          ? Number(editingService.dailyRate)
          : null,
      description: specs.description,
      notes: specs.notes,
    };
  }, [editingService]);

  return (
    <section className="space-y-6">
      {isTokenMissing ? (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          Faça login para visualizar o catálogo.
        </Card>
      ) : null}

      <PageHeader
        title="Catálogo de serviços"
        description="Organize equipamentos, pacotes e valores para montar propostas consistentes."
        action={
          <Button
            className="w-full sm:w-auto"
            onClick={() => setCreateDialogOpen(true)}
            disabled={!canCreate}
          >
            Novo serviço
          </Button>
        }
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
                  <Button variant="outline" size="sm" onClick={() => setEditingService(service)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(service)}>
                    Excluir
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
            <Button onClick={() => setCreateDialogOpen(true)} disabled={!canCreate}>
              Novo serviço
            </Button>
          </Card>
        )}
      </div>

      {canCreate ? (
        <ServiceDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={async (values) => {
            await createService.mutateAsync(values);
          }}
          isSubmitting={createService.isPending}
          errorMessage={createService.error?.message}
          title="Novo serviço"
          description="Cadastre um equipamento ou pacote para reutilizar nas propostas."
          submitLabel="Salvar serviço"
        />
      ) : null}

      {editingService ? (
        <ServiceDialog
          open={Boolean(editingService)}
          onOpenChange={(open) => {
            if (!open) setEditingService(null);
          }}
          onSubmit={async (values) => {
            await updateService.mutateAsync({ id: editingService.id, payload: values });
          }}
          isSubmitting={updateService.isPending}
          errorMessage={updateService.error?.message}
          title="Editar serviço"
          description="Atualize as informações e elas serão refletidas nas próximas propostas."
          submitLabel="Salvar alterações"
          initialValues={editingInitialValues}
        />
      ) : null}

      {deleteTarget ? (
        <Dialog.Root
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
              <Card className="w-full max-w-md space-y-4 border border-danger/40 bg-white p-6 shadow-2xl">
                <div className="space-y-1">
                  <Dialog.Title className="text-lg font-semibold text-ink">Remover serviço</Dialog.Title>
                  <Dialog.Description className="text-sm text-muted">
                    Tem certeza que deseja remover &ldquo;{deleteTarget.name}&rdquo;? Essa ação não pode ser desfeita.
                  </Dialog.Description>
                </div>
                {deleteError ? (
                  <p className="rounded-lg border border-danger/40 bg-danger-soft/20 px-3 py-2 text-sm text-danger">
                    {deleteError}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <Button variant="ghost" disabled={deleteServiceMutation.isPending}>
                      Cancelar
                    </Button>
                  </Dialog.Close>
                  <Button
                    variant="danger"
                    onClick={() => deleteServiceMutation.mutate(deleteTarget.id)}
                    disabled={deleteServiceMutation.isPending}
                  >
                    {deleteServiceMutation.isPending ? 'Removendo...' : 'Remover'}
                  </Button>
                </div>
              </Card>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </section>
  );
}
