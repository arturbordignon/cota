"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Plus, Trash, Truck } from "@phosphor-icons/react";

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
import { useErrorMessage } from "@/hooks/use-error-message";
import { useCurrentUser } from "@/components/providers/user-provider";
import { useAccountCurrency } from "@/hooks/use-account-currency";
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
  const t = useTranslations("services.form");
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
        <Field label={t("name")} htmlFor="service-name">
          <Input
            id="service-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("placeholders.name")}
            required
            disabled={isSubmitting}
            autoFocus
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("capacity")} htmlFor="service-capacity">
            <Input
              id="service-capacity"
              inputMode="decimal"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              placeholder={t("placeholders.capacity")}
              disabled={isSubmitting}
            />
          </Field>
          <Field label={t("rate")} htmlFor="service-rate">
            <Input
              id="service-rate"
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder={t("placeholders.rate")}
              disabled={isSubmitting}
            />
          </Field>
        </div>
        <Field label={t("description")} htmlFor="service-description">
          <Textarea
            id="service-description"
            rows={3}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={t("placeholders.description")}
            disabled={isSubmitting}
          />
        </Field>
        <Field label={t("notes")} htmlFor="service-notes">
          <Textarea
            id="service-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t("placeholders.notes")}
            disabled={isSubmitting}
          />
        </Field>
        {errorMessage ? <Notice tone="danger">{errorMessage}</Notice> : null}
      </ModalBody>
      <ModalFooter>
        <ModalClose asChild>
          <Button type="button" variant="ghost" disabled={isSubmitting}>
            {t("cancel")}
          </Button>
        </ModalClose>
        <Button type="submit" disabled={isSubmitting || !name.trim()} loading={isSubmitting} loadingText={t("saving")}>
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
  const t = useTranslations("services");
  const mensagemDeErro = useErrorMessage();
  const api = useApi();
  const moeda = useAccountCurrency();
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
  // Members who can only view services don't get create, edit or delete.
  const { temPermissao } = useCurrentUser();
  const canCreate = Boolean(api.token) && temPermissao("services", "edit");

  const updateService = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServicePayload }) =>
      // Emptied fields go out as null / "" so they are cleared, not kept.
      api.put<{ data: EquipmentSummary }>(`/equipment/${id}`, {
        name: payload.name,
        capacityTons: payload.capacityTons ?? null,
        dailyRate: payload.dailyRate ?? null,
        description: payload.description ?? "",
        notes: payload.notes ?? "",
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
      setDeleteError(mensagemDeErro(error, { padrao: t("deleteDialog.error") }));
    },
  });

  const formatCurrency = (dailyRate?: string | null) => {
    if (!dailyRate) return null;
    const value = Number(dailyRate);
    if (Number.isNaN(value)) return null;
    return format.number(value, {
      style: 'currency',
      currency: moeda,
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
        title={t("page.title")}
        description={t("page.description")}
        action={
          canCreate && (
            <Button asChild>
              <Link href={"/services/new" as Route}>
                <Plus size={16} weight="bold" />
                {t("page.newService")}
              </Link>
            </Button>
          )
        }
      />

      {isTokenMissing ? <Notice tone="warning">{t("page.loginNeeded")}</Notice> : null}

      {loadError && !isTokenMissing ? (
        <Notice tone="danger">{t("page.loadError")}</Notice>
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
                    <Truck size={20} weight="bold" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-sans text-[15px] font-semibold leading-snug text-ink">{service.name}</h3>
                    {service.capacityTons != null ? (
                      <p className="tabular text-[13px] text-muted">{t("page.capacity", { value: service.capacityTons })}</p>
                    ) : null}
                  </div>
                </div>

                <p className="mb-4 mt-4 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                  {description ?? notes ?? t("page.noDetails")}
                </p>

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
                  <div>
                    <p className="meta-label">{t("page.dailyRate")}</p>
                    <p className="tabular font-display text-xl font-semibold leading-tight text-ink">
                      {formattedRate ?? "—"}
                    </p>
                  </div>
                  {canCreate ? (
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => setEditingService(service)}>
                        <PencilSimple size={14} weight="bold" />
                        {t("page.edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(service)}
                        aria-label={t("page.deleteLabel", { name: service.name })}
                        className="hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Truck size={24} weight="bold" />}
          title={t("page.empty.title")}
          description={t("page.empty.description")}
          action={
            canCreate && (
              <Button asChild>
                <Link href={"/services/new" as Route}>
                  <Plus size={16} weight="bold" />
                  {t("page.newService")}
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
          errorMessage={updateService.error ? mensagemDeErro(updateService.error, { padrao: t("form.saveError") }) : undefined}
          title={t("editDialog.title")}
          description={t("editDialog.description")}
          submitLabel={t("editDialog.submit")}
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
          title={t("deleteDialog.title")}
          description={t("deleteDialog.description", { name: deleteTarget.name })}
        >
          {deleteError ? (
            <ModalBody>
              <Notice tone="danger">{deleteError}</Notice>
            </ModalBody>
          ) : null}
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="ghost" disabled={deleteServiceMutation.isPending}>
                {t("deleteDialog.cancel")}
              </Button>
            </ModalClose>
            <Button
              variant="danger"
              onClick={() => deleteServiceMutation.mutate(deleteTarget.id)}
              loading={deleteServiceMutation.isPending}
              loadingText={t("deleteDialog.confirming")}
            >
              {t("deleteDialog.confirm")}
            </Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </section>
  );
}
