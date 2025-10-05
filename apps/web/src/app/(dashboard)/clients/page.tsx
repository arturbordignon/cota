"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { X } from "@phosphor-icons/react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";

interface Client {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientsResponse {
  data: Client[];
}

interface ClientResponse {
  data: Client;
}

interface ClientDetailsView {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

const addClientSchema = z.object({
  name: z.string().min(2),
  companyName: z.string().optional(),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
type AddClientForm = z.infer<typeof addClientSchema>;

function AddClientDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  errorMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddClientForm) => Promise<void>;
  isLoading: boolean;
  errorMessage?: string;
}) {
  const t = useTranslations("clients.dialog");
  const form = useForm<AddClientForm>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      name: '',
      companyName: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (isLoading) return;
    try {
      await onSubmit(values);
      form.reset();
    } catch (error) {
      // keep current values so the user can adjust and submit again
    }
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline/20 px-6 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-ink">{t('title')}</Dialog.Title>
                <Dialog.Description className="text-xs text-muted">{t('description')}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                  aria-label={t('close')}
                >
                  <X size={16} weight="bold" />
                </button>
              </Dialog.Close>
            </div>

            <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="client-name">{t('fields.name')}</Label>
                <Input
                  id="client-name"
                  {...form.register('name')}
                  placeholder={t('placeholders.name')}
                  disabled={isLoading}
                />
                {form.formState.errors.name ? (
                  <p className="text-xs text-danger">{t('errors.name')}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-company">{t('fields.company')}</Label>
                <Input
                  id="client-company"
                  {...form.register('companyName')}
                  placeholder={t('placeholders.company')}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client-email">{t('fields.email')}</Label>
                <Input
                  id="client-email"
                  type="email"
                  {...form.register('email')}
                  placeholder={t('placeholders.email')}
                  disabled={isLoading}
                />
                  {form.formState.errors.email ? (
                    <p className="text-xs text-danger">{t('errors.email')}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">{t('fields.phone')}</Label>
                <Input
                  id="client-phone"
                  {...form.register('phone')}
                  placeholder={t('placeholders.phone')}
                  disabled={isLoading}
                />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-notes">{t('fields.notes')}</Label>
                <Textarea
                  id="client-notes"
                  rows={3}
                  {...form.register('notes')}
                  placeholder={t('placeholders.notes')}
                  disabled={isLoading}
                />
              </div>

              {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    {t('cancel')}
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  disabled={!form.formState.isValid}
                  loading={isLoading}
                  loadingText={t('saving')}
                >
                  {t('save')}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ClientDetailsDialog({
  open,
  onOpenChange,
  client,
  isLoading,
  errorMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientDetailsView;
  isLoading: boolean;
  errorMessage?: string;
}) {
  const t = useTranslations("clients.details");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline/20 px-6 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-ink">
                  {client?.name ?? t('loading')}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted">
                  {t('subtitle')}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                  aria-label={t('close')}
                >
                  <X size={16} weight="bold" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4 px-6 py-6 text-sm">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-outline/40" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-outline/30" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-outline/20" />
                </div>
              ) : errorMessage ? (
                <p className="text-danger">{errorMessage}</p>
              ) : client ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">{t('fields.company')}</p>
                    <p className="text-ink">{client.companyName ?? t('placeholders.empty')}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">{t('fields.email')}</p>
                      <p className="text-ink">{client.email ?? t('placeholders.empty')}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">{t('fields.phone')}</p>
                      <p className="text-ink">{client.phone ?? t('placeholders.empty')}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">{t('fields.notes')}</p>
                    <p className="whitespace-pre-wrap text-ink">{client.notes ?? t('placeholders.empty')}</p>
                  </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">{t('fields.createdAt')}</p>
                    <p className="text-ink">{client.createdAt}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">{t('fields.updatedAt')}</p>
                    <p className="text-ink">{client.updatedAt}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted">{t('notFound')}</p>
              )}
            </div>

            <div className="flex justify-end border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
              <Dialog.Close asChild>
                <Button variant="ghost">{t('close')}</Button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function ClientsPage() {
  const t = useTranslations("clients");
  const tActions = useTranslations("actions");
  const format = useFormatter();
  const api = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const formatDate = (date: string) =>
    format.dateTime(new Date(date), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const clientsQuery = useQuery<ClientsResponse, Error>({
    queryKey: ['clients'],
    queryFn: () => api.get<ClientsResponse>('/clients'),
    enabled: Boolean(api.token),
  });

  const createClient = useMutation<{ data: Client }, Error, AddClientForm>({
    mutationFn: async (values) =>
      api.post<{ data: Client }>('/clients', {
        name: values.name,
        companyName: values.companyName?.trim() || undefined,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDialogOpen(false);
    },
  });

  const clients = useMemo(() => clientsQuery.data?.data ?? [], [clientsQuery.data]);

  const isLoading = api.token ? clientsQuery.isLoading : false;
  const error = api.token ? clientsQuery.error : undefined;
  const canCreate = Boolean(api.token);

  const clientDetailsQuery = useQuery<ClientResponse, Error>({
    queryKey: ['clients', selectedClientId],
    queryFn: () => api.get<ClientResponse>(`/clients/${selectedClientId}`),
    enabled: Boolean(api.token && selectedClientId && detailsOpen),
  });

  const formattedClient: ClientDetailsView | undefined = clientDetailsQuery.data
    ? {
        ...clientDetailsQuery.data.data,
        createdAt: formatDate(clientDetailsQuery.data.data.createdAt),
        updatedAt: formatDate(clientDetailsQuery.data.data.updatedAt),
      }
    : undefined;

  const openDetails = (clientId: string) => {
    setSelectedClientId(clientId);
    setDetailsOpen(true);
  };

  const closeDetails = (open: boolean) => {
    if (!open) {
      setDetailsOpen(false);
      setSelectedClientId(null);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)} disabled={!canCreate}>
            {t('actions.add')}
          </Button>
        }
      />

      {api.token ? null : (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          {t('warnings.tokenMissing')}
        </Card>
      )}

      {isLoading ? (
        <Card className="border border-outline/30 bg-white px-6 py-10 text-center text-sm text-muted">
          {t('states.loading')}
        </Card>
      ) : null}

      {error ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t('states.error')} {error.message}
        </Card>
      ) : null}

      {api.token && !isLoading && !error ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="flex flex-col gap-3 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink">{client.name}</h3>
                <Badge tone="info">{t("badges.memberSince", { date: formatDate(client.createdAt) })}</Badge>
              </div>
              <div className="space-y-1 text-sm text-muted">
                {client.companyName ? <p>{client.companyName}</p> : null}
                {client.email ? <p>{client.email}</p> : null}
                {client.phone ? <p>{client.phone}</p> : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={() => openDetails(client.id)}
              >
                {tActions('viewDetails')}
              </Button>
            </Card>
          ))}
          {clients.length === 0 ? (
            <Card className="border border-outline/40 bg-white px-6 py-10 text-center text-sm text-muted">
              {t('states.empty')}
            </Card>
          ) : null}
        </div>
      ) : null}

      {canCreate ? (
        <AddClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={(values) => createClient.mutateAsync(values)}
          isLoading={createClient.isPending}
          errorMessage={createClient.error?.message}
        />
      ) : null}

      {selectedClientId ? (
        <ClientDetailsDialog
          open={detailsOpen}
          onOpenChange={closeDetails}
          client={formattedClient}
          isLoading={clientDetailsQuery.isLoading}
          errorMessage={clientDetailsQuery.error?.message}
        />
      ) : null}
    </section>
  );
}
