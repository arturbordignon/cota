"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { DotsThreeVertical, PaperPlaneTilt, UserCircle, X } from "@phosphor-icons/react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { StatCard } from "@/components/reports/stat-card";

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
  email: z.string().email().optional().or(z.literal("")),
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
      name: "",
      companyName: "",
      email: "",
      phone: "",
      notes: "",
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
                <Dialog.Title className="text-lg font-semibold text-ink">{t("title")}</Dialog.Title>
                <Dialog.Description className="text-xs text-muted">
                  {t("description")}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                  aria-label={t("close")}
                >
                  <X size={16} weight="bold" />
                </button>
              </Dialog.Close>
            </div>

            <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="client-name">{t("fields.name")}</Label>
                <Input
                  id="client-name"
                  {...form.register("name")}
                  placeholder={t("placeholders.name")}
                  disabled={isLoading}
                />
                {form.formState.errors.name ? (
                  <p className="text-xs text-danger">{t("errors.name")}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-company">{t("fields.company")}</Label>
                <Input
                  id="client-company"
                  {...form.register("companyName")}
                  placeholder={t("placeholders.company")}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client-email">{t("fields.email")}</Label>
                  <Input
                    id="client-email"
                    type="email"
                    {...form.register("email")}
                    placeholder={t("placeholders.email")}
                    disabled={isLoading}
                  />
                  {form.formState.errors.email ? (
                    <p className="text-xs text-danger">{t("errors.email")}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">{t("fields.phone")}</Label>
                  <Input
                    id="client-phone"
                    {...form.register("phone")}
                    placeholder={t("placeholders.phone")}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-notes">{t("fields.notes")}</Label>
                <Textarea
                  id="client-notes"
                  rows={3}
                  {...form.register("notes")}
                  placeholder={t("placeholders.notes")}
                  disabled={isLoading}
                />
              </div>

              {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    {t("cancel")}
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  disabled={!form.formState.isValid}
                  loading={isLoading}
                  loadingText={t("saving")}
                >
                  {t("save")}
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
                  {client?.name ?? t("loading")}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted">
                  {t("subtitle")}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                  aria-label={t("close")}
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
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {t("fields.company")}
                    </p>
                    <p className="text-ink">{client.companyName ?? t("placeholders.empty")}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {t("fields.email")}
                      </p>
                      <p className="text-ink">{client.email ?? t("placeholders.empty")}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {t("fields.phone")}
                      </p>
                      <p className="text-ink">{client.phone ?? t("placeholders.empty")}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {t("fields.notes")}
                    </p>
                    <p className="whitespace-pre-wrap text-ink">
                      {client.notes ?? t("placeholders.empty")}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {t("fields.createdAt")}
                      </p>
                      <p className="text-ink">{client.createdAt}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {t("fields.updatedAt")}
                      </p>
                      <p className="text-ink">{client.updatedAt}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted">{t("notFound")}</p>
              )}
            </div>

            <div className="flex justify-end border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
              <Dialog.Close asChild>
                <Button variant="ghost">{t("close")}</Button>
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
  const format = useFormatter();
  const api = useApi();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<"recent" | "oldest" | "name">("recent");
  const [contactFilter, setContactFilter] = useState<"all" | "withEmail" | "withPhone">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setOpenMenuId(null);
  }, [searchTerm, contactFilter, sortOption]);

  const formatDate = (date: string) =>
    format.dateTime(new Date(date), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const clientsQuery = useQuery<ClientsResponse, Error>({
    queryKey: ["clients"],
    queryFn: () => api.get<ClientsResponse>("/clients"),
    enabled: Boolean(api.token),
  });

  const createClient = useMutation<{ data: Client }, Error, AddClientForm>({
    mutationFn: async (values) =>
      api.post<{ data: Client }>("/clients", {
        name: values.name,
        companyName: values.companyName?.trim() || undefined,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
    },
  });

  const clients = useMemo(() => clientsQuery.data?.data ?? [], [clientsQuery.data]);

  const isLoading = api.token ? clientsQuery.isLoading : false;
  const error = api.token ? clientsQuery.error : undefined;
  const canCreate = Boolean(api.token);

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const base = clients.filter((client) => {
      if (!normalizedSearch) return true;
      return [client.name, client.companyName, client.email, client.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    });

    const contactFiltered = base.filter((client) => {
      if (contactFilter === "withEmail") return Boolean(client.email);
      if (contactFilter === "withPhone") return Boolean(client.phone);
      return true;
    });

    const sorted = [...contactFiltered];
    sorted.sort((a, b) => {
      if (sortOption === "name") {
        return a.name.localeCompare(b.name);
      }
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      if (sortOption === "oldest") {
        return dateA - dateB;
      }
      return dateB - dateA;
    });

    return sorted;
  }, [clients, contactFilter, searchTerm, sortOption]);

  const totalClients = clients.length;
  const clientsWithEmail = clients.filter((client) => Boolean(client.email)).length;
  const createdLast30Days = clients.filter((client) => {
    const createdAt = new Date(client.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt >= thirtyDaysAgo;
  }).length;
  const highlightedClients = useMemo(
    () =>
      [...clients]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [clients],
  );

  const clientDetailsQuery = useQuery<ClientResponse, Error>({
    queryKey: ["clients", selectedClientId],
    queryFn: () => api.get<ClientResponse>(`/clients/${selectedClientId}`),
    enabled: Boolean(api.token && selectedClientId && detailsOpen),
  });

  useEffect(() => {
    if (!openMenuId) {
      menuContainerRef.current = null;
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

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
        title={t("title")}
        description={t("description")}
        action={
          <Button
            className="w-full sm:w-auto"
            onClick={() => setDialogOpen(true)}
            disabled={!canCreate}
          >
            {t("actions.add")}
          </Button>
        }
      />

      {api.token ? null : (
        <Card className="border border-warning/40 bg-warning-soft px-6 py-4 text-sm text-warning">
          {t("warnings.tokenMissing")}
        </Card>
      )}

      {api.token && clients.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label={t("stats.total")} value={totalClients.toLocaleString()} />
          <StatCard
            label={t("stats.recent")}
            value={createdLast30Days.toLocaleString()}
            hint={t("stats.recentHint")}
          />
          <StatCard label={t("stats.withEmail")} value={clientsWithEmail.toLocaleString()} />
        </div>
      ) : null}

      <Card className="border border-outline/40 bg-white/95 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xl">
            <Label htmlFor="client-search" className="text-xs uppercase tracking-wide text-muted">
              {t("filters.search.label")}
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="client-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("filters.search.placeholder")}
                className="w-full"
              />
              {searchTerm ? (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
                  {t("filters.clearSearch")}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <p className="text-xs text-muted">
              {searchTerm || contactFilter !== "all" || sortOption !== "recent"
                ? t("filters.summaryFiltered", {
                    count: filteredClients.length,
                    total: clients.length,
                  })
                : t("filters.summaryAll", { total: clients.length })}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setFiltersOpen((prev) => !prev)}>
              {filtersOpen ? t("filters.hide") : t("filters.show")}
            </Button>
          </div>
        </div>

        <div
          className={`grid gap-4 overflow-hidden transition-[grid-template-rows,opacity] duration-200 ${
            filtersOpen ? "mt-4 opacity-100 grid-rows-[1fr]" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted">
                {t("filters.sort.label")}
              </Label>
              <Select
                value={sortOption}
                onValueChange={(value) => setSortOption(value as typeof sortOption)}
              >
                <SelectItem value="recent">{t("filters.sort.recent")}</SelectItem>
                <SelectItem value="oldest">{t("filters.sort.oldest")}</SelectItem>
                <SelectItem value="name">{t("filters.sort.name")}</SelectItem>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted">
                {t("filters.contact.label")}
              </Label>
              <Select
                value={contactFilter}
                onValueChange={(value) => setContactFilter(value as typeof contactFilter)}
              >
                <SelectItem value="all">{t("filters.contact.all")}</SelectItem>
                <SelectItem value="withEmail">{t("filters.contact.withEmail")}</SelectItem>
                <SelectItem value="withPhone">{t("filters.contact.withPhone")}</SelectItem>
              </Select>
            </div>

            <div className="flex items-end justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setContactFilter("all");
                  setSortOption("recent");
                }}
              >
                {t("filters.clear")}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card className="border border-outline/30 bg-white px-6 py-10 text-center text-sm text-muted">
          {t("states.loading")}
        </Card>
      ) : null}

      {error ? (
        <Card className="border border-danger/40 bg-danger-soft/20 px-6 py-4 text-sm text-danger">
          {t("states.error")} {error.message}
        </Card>
      ) : null}

      {api.token && !isLoading && !error ? (
        filteredClients.length > 0 ? (
          <Card className="rounded-3xl border-outline bg-white p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[720px] table-auto text-sm">
                <thead className="bg-surface text-muted">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">{t("table.headers.name")}</th>
                    <th className="px-6 py-4 text-left font-medium">
                      {t("table.headers.company")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium">{t("table.headers.email")}</th>
                    <th className="px-6 py-4 text-left font-medium">{t("table.headers.phone")}</th>
                    <th className="px-6 py-4 text-left font-medium">
                      {t("table.headers.createdAt")}
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      {t("table.headers.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const isMenuOpen = openMenuId === client.id;
                    return (
                      <tr
                        key={client.id}
                        className="border-t border-outline/50 transition hover:bg-surface/40"
                      >
                        <td className="px-6 py-4 text-ink">
                          <div className="flex flex-col">
                            <span className="font-medium text-ink">{client.name}</span>
                            <span className="text-xs text-muted">
                              {t("badges.memberSince", { date: formatDate(client.createdAt) })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted">
                          {client.companyName ?? t("table.noCompany")}
                        </td>
                        <td className="px-6 py-4 text-muted">
                          {client.email ?? t("table.noEmail")}
                        </td>
                        <td className="px-6 py-4 text-muted">
                          {client.phone ?? t("table.noPhone")}
                        </td>
                        <td className="px-6 py-4 text-muted">{formatDate(client.createdAt)}</td>
                        <td className="px-6 py-4 text-right">
                          <div
                            className="relative inline-flex"
                            ref={
                              isMenuOpen
                                ? (node) => {
                                    menuContainerRef.current = node;
                                  }
                                : undefined
                            }
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === client.id ? null : client.id))
                              }
                              aria-haspopup="menu"
                              aria-expanded={isMenuOpen}
                              aria-label={t("table.actions.openMenu")}
                            >
                              <DotsThreeVertical size={18} />
                            </Button>
                            {isMenuOpen ? (
                              <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-outline/40 bg-white p-2 text-left shadow-xl">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start gap-2"
                                  asChild
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <Link href={`/proposals/new?clientId=${client.id}`}>
                                    <PaperPlaneTilt size={16} />
                                    {t("table.actions.sendProposal")}
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start gap-2"
                                  onClick={() => {
                                    openDetails(client.id);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <UserCircle size={16} />
                                  {t("table.view")}
                                </Button>
                                {client.email ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2"
                                    onClick={() => {
                                      navigator.clipboard
                                        .writeText(client.email as string)
                                        .then(() => {
                                          setCopiedClientId(client.id);
                                          setTimeout(() => setCopiedClientId(null), 2000);
                                        })
                                        .catch(() => {
                                          setCopiedClientId(null);
                                        });
                                    }}
                                  >
                                    {client.email}
                                    {copiedClientId === client.id
                                      ? ` • ${t("table.actions.copied")}`
                                      : ` • ${t("table.actions.copyEmail")}`}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2 text-muted"
                                    disabled
                                  >
                                    {t("table.actions.noEmail")}
                                  </Button>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="border border-outline/40 bg-white px-6 py-10 text-center text-sm text-muted">
            {t("states.empty")}
          </Card>
        )
      ) : null}

      {canCreate ? (
        <AddClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={async (values) => {
            await createClient.mutateAsync(values);
          }}
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
