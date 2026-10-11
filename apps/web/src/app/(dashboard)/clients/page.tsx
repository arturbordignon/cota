"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Check, Copy, DotsThreeVertical, PaperPlaneTilt, Plus, UserCircle, UsersThree } from "@phosphor-icons/react";
import { z } from "zod";

import { FilterBar } from "@/components/layout/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalClose, ModalFooter } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink";

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
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
        }
        onOpenChange(next);
      }}
      title={t("title")}
      description={t("description")}
      closeLabel={t("close")}
      onSubmit={handleSubmit}
    >
      <ModalBody>
        <Field label={t("fields.name")} htmlFor="client-name" error={form.formState.errors.name ? t("errors.name") : undefined}>
          <Input
            id="client-name"
            {...form.register("name")}
            placeholder={t("placeholders.name")}
            disabled={isLoading}
            aria-invalid={Boolean(form.formState.errors.name)}
            autoFocus
          />
        </Field>

        <Field label={t("fields.company")} htmlFor="client-company">
          <Input
            id="client-company"
            {...form.register("companyName")}
            placeholder={t("placeholders.company")}
            disabled={isLoading}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("fields.email")} htmlFor="client-email" error={form.formState.errors.email ? t("errors.email") : undefined}>
            <Input
              id="client-email"
              type="email"
              {...form.register("email")}
              placeholder={t("placeholders.email")}
              disabled={isLoading}
              aria-invalid={Boolean(form.formState.errors.email)}
            />
          </Field>
          <Field label={t("fields.phone")} htmlFor="client-phone">
            <Input
              id="client-phone"
              {...form.register("phone")}
              placeholder={t("placeholders.phone")}
              disabled={isLoading}
            />
          </Field>
        </div>

        <Field label={t("fields.notes")} htmlFor="client-notes">
          <Textarea
            id="client-notes"
            rows={3}
            {...form.register("notes")}
            placeholder={t("placeholders.notes")}
            disabled={isLoading}
          />
        </Field>

        {errorMessage ? <Notice tone="danger">{errorMessage}</Notice> : null}
      </ModalBody>
      <ModalFooter>
        <ModalClose asChild>
          <Button type="button" variant="ghost">
            {t("cancel")}
          </Button>
        </ModalClose>
        <Button
          type="submit"
          disabled={!form.formState.isValid}
          loading={isLoading}
          loadingText={t("saving")}
        >
          {t("save")}
        </Button>
      </ModalFooter>
    </Modal>
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

  const vazio = t("placeholders.empty");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={client?.name ?? t("loading")}
      description={t("subtitle")}
      closeLabel={t("close")}
    >
      <ModalBody className="text-sm">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : errorMessage ? (
          <Notice tone="danger">{errorMessage}</Notice>
        ) : client ? (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="meta-label">{t("fields.company")}</dt>
              <dd className="mt-1 text-ink">{client.companyName ?? vazio}</dd>
            </div>
            <div>
              <dt className="meta-label">{t("fields.email")}</dt>
              <dd className="mt-1 break-all text-ink">{client.email ?? vazio}</dd>
            </div>
            <div>
              <dt className="meta-label">{t("fields.phone")}</dt>
              <dd className="mt-1 text-ink">{client.phone ?? vazio}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="meta-label">{t("fields.notes")}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">{client.notes ?? vazio}</dd>
            </div>
            <div>
              <dt className="meta-label">{t("fields.createdAt")}</dt>
              <dd className="mt-1 text-ink">{client.createdAt}</dd>
            </div>
            <div>
              <dt className="meta-label">{t("fields.updatedAt")}</dt>
              <dd className="mt-1 text-ink">{client.updatedAt}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted">{t("notFound")}</p>
        )}
      </ModalBody>
      <ModalFooter>
        <ModalClose asChild>
          <Button variant="secondary">{t("close")}</Button>
        </ModalClose>
      </ModalFooter>
    </Modal>
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
          <Button onClick={() => setDialogOpen(true)} disabled={!canCreate}>
            <Plus size={16} weight="bold" />
            {t("actions.add")}
          </Button>
        }
      />

      {api.token ? null : <Notice tone="warning">{t("warnings.tokenMissing")}</Notice>}

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

      <FilterBar
        busca={searchTerm}
        placeholder={t("filters.search.placeholder")}
        aoBuscar={setSearchTerm}
        opcoes={[
          { id: "all", rotulo: t("filters.contact.all") },
          { id: "withEmail", rotulo: t("filters.contact.withEmail") },
          { id: "withPhone", rotulo: t("filters.contact.withPhone") },
        ]}
        opcaoAtiva={contactFilter}
        aoEscolher={(valor) => setContactFilter(valor as typeof contactFilter)}
        aoLimpar={() => {
          setSearchTerm("");
          setContactFilter("all");
          setSortOption("recent");
        }}
        rotuloLimpar={t("filters.clear")}
        extra={
          <Select
            value={sortOption}
            onValueChange={(value) => setSortOption(value as typeof sortOption)}
            aria-label={t("filters.sort.label")}
          >
            <SelectItem value="recent">{t("filters.sort.recent")}</SelectItem>
            <SelectItem value="oldest">{t("filters.sort.oldest")}</SelectItem>
            <SelectItem value="name">{t("filters.sort.name")}</SelectItem>
          </Select>
        }
      />

      {isLoading ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {error ? (
        <Notice tone="danger">
          {t("states.error")} {error.message}
        </Notice>
      ) : null}

      {api.token && !isLoading && !error ? (
        filteredClients.length > 0 ? (
          <Card>
            {/* Visible overflow on wide screens so the row menu is not clipped. */}
            <div className="w-full overflow-x-auto rounded-xl xl:overflow-visible">
              <table className="data-table data-table--rounded min-w-[760px]">
                <thead>
                  <tr>
                    <th>{t("table.headers.name")}</th>
                    <th>{t("table.headers.company")}</th>
                    <th>{t("table.headers.email")}</th>
                    <th>{t("table.headers.phone")}</th>
                    <th>{t("table.headers.createdAt")}</th>
                    <th className="text-right">
                      <span className="sr-only">{t("table.headers.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const isMenuOpen = openMenuId === client.id;
                    return (
                      <tr key={client.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => openDetails(client.id)}
                            className="flex items-center gap-3 text-left"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-bold text-ink-muted">
                              {client.name.trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="font-semibold text-ink hover:underline">{client.name}</span>
                          </button>
                        </td>
                        <td>{client.companyName ?? <span className="text-muted">{t("table.noCompany")}</span>}</td>
                        <td>{client.email ?? <span className="text-muted">{t("table.noEmail")}</span>}</td>
                        <td className="tabular whitespace-nowrap">
                          {client.phone ?? <span className="text-muted">{t("table.noPhone")}</span>}
                        </td>
                        <td className="tabular whitespace-nowrap">{formatDate(client.createdAt)}</td>
                        <td className="text-right">
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
                              size="icon-sm"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === client.id ? null : client.id))
                              }
                              aria-haspopup="menu"
                              aria-expanded={isMenuOpen}
                              aria-label={t("table.actions.openMenu")}
                            >
                              <DotsThreeVertical size={18} weight="bold" />
                            </Button>
                            {isMenuOpen ? (
                              <div
                                role="menu"
                                className="absolute right-0 top-9 z-20 w-60 rounded-xl border border-border bg-white p-1.5 text-left shadow-raised animate-pop-in"
                              >
                                <Link
                                  href={`/proposals/new?clientId=${client.id}`}
                                  role="menuitem"
                                  className={menuItemClass}
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <PaperPlaneTilt size={16} />
                                  {t("table.actions.sendProposal")}
                                </Link>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={menuItemClass}
                                  onClick={() => {
                                    openDetails(client.id);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <UserCircle size={16} />
                                  {t("table.view")}
                                </button>
                                {client.email ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={menuItemClass}
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
                                    {copiedClientId === client.id ? (
                                      <Check size={16} className="text-success" />
                                    ) : (
                                      <Copy size={16} />
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block">
                                        {copiedClientId === client.id
                                          ? t("table.actions.copied")
                                          : t("table.actions.copyEmail")}
                                      </span>
                                      <span className="block truncate text-xs font-normal text-muted">{client.email}</span>
                                    </span>
                                  </button>
                                ) : (
                                  <p className="px-2.5 py-2 text-sm text-muted">{t("table.actions.noEmail")}</p>
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
          <EmptyState
            icon={<UsersThree size={24} weight="bold" />}
            title={t("states.empty")}
            action={
              clients.length === 0 && canCreate ? (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus size={16} weight="bold" />
                  {t("actions.add")}
                </Button>
              ) : undefined
            }
          />
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
