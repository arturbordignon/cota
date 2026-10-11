"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useFormatter } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crane, PencilSimple, Plus, Trash } from "@phosphor-icons/react";

import type { Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Modal
      open={open}
      onOpenChange={handleClose}
      title={title}
      description={description}
      onSubmit={handleSubmit}
    >
      <ModalBody>
        <Field label="Nome" htmlFor="service-name">
          <Input
            id="service-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Guindaste 50t"
            required
            disabled={isSubmitting}
            autoFocus
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Capacidade (t)" htmlFor="service-capacity">
            <Input
              id="service-capacity"
              inputMode="decimal"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="Ex.: 50"
              disabled={isSubmitting}
            />
          </Field>
          <Field label="Valor diário (BRL)" htmlFor="service-rate">
            <Input
              id="service-rate"
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder="Ex.: 2500"
              disabled={isSubmitting}
            />
          </Field>
        </div>
        <Field label="Descrição" htmlFor="service-description">
          <Textarea
            id="service-description"
            rows={3}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Resumo do serviço ou equipamento"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Observações internas" htmlFor="service-notes">
          <Textarea
            id="service-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Links, restrições ou observações"
            disabled={isSubmitting}
          />
        </Field>
        {errorMessage ? <Notice tone="danger">{errorMessage}</Notice> : null}
      </ModalBody>
      <ModalFooter>
        <ModalClose asChild>
          <Button type="button" variant="ghost" disabled={isSubmitting}>
            Cancelar
          </Button>
        </ModalClose>
        <Button type="submit" disabled={isSubmitting || !name.trim()} loading={isSubmitting} loadingText="Salvando…">
          {submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
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
      <PageHeader
        title="Catálogo de serviços"
        description="Organize equipamentos, pacotes e valores para montar propostas consistentes."
        action={
          canCreate && (
            <Button asChild>
              <Link href={"/services/new" as Route}>
                <Plus size={16} weight="bold" />
                Novo serviço
              </Link>
            </Button>
          )
        }
      />

      {isTokenMissing ? <Notice tone="warning">Faça login para visualizar o catálogo.</Notice> : null}

      {loadError && !isTokenMissing ? (
        <Notice tone="danger">Não foi possível carregar os serviços: {loadError.message}</Notice>
      ) : null}

      {equipmentQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`service-skeleton-${index}`} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : services.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const formattedRate = formatCurrency(service.dailyRate);
            const { description, notes } = extractSpecs(service);
            return (
              <Card key={service.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong">
                    <Crane size={20} weight="bold" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-sans text-[15px] font-semibold leading-snug text-ink">{service.name}</h3>
                    {service.capacityTons != null ? (
                      <p className="tabular text-[13px] text-muted">Capacidade {service.capacityTons} t</p>
                    ) : null}
                  </div>
                </div>

                <p className="mb-4 mt-4 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                  {description ?? notes ?? "Sem detalhes adicionais"}
                </p>

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
                  <div>
                    <p className="meta-label">Diária</p>
                    <p className="tabular font-display text-xl font-semibold leading-tight text-ink">
                      {formattedRate ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="secondary" size="sm" onClick={() => setEditingService(service)}>
                      <PencilSimple size={14} weight="bold" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(service)}
                      aria-label={`Excluir ${service.name}`}
                      className="hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Crane size={24} weight="bold" />}
          title="Nenhum serviço cadastrado ainda."
          description="Adicione seus equipamentos e pacotes principais para reutilizar os valores nas propostas."
          action={
            canCreate && (
              <Button asChild>
                <Link href={"/services/new" as Route}>
                  <Plus size={16} weight="bold" />
                  Novo serviço
                </Link>
              </Button>
            )
          }
        />
      )}

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
        <Modal
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
          size="sm"
          title="Remover serviço"
          description={`Tem certeza que deseja remover “${deleteTarget.name}”? Essa ação não pode ser desfeita.`}
        >
          {deleteError ? (
            <ModalBody>
              <Notice tone="danger">{deleteError}</Notice>
            </ModalBody>
          ) : null}
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="ghost" disabled={deleteServiceMutation.isPending}>
                Cancelar
              </Button>
            </ModalClose>
            <Button
              variant="danger"
              onClick={() => deleteServiceMutation.mutate(deleteTarget.id)}
              loading={deleteServiceMutation.isPending}
              loadingText="Removendo..."
            >
              Remover
            </Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </section>
  );
}
