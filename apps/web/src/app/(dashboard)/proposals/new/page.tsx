"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TemplateSummary, TemplatesResponse } from "@/types/api";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { UploadArea } from "@/components/ui/upload-area";

const sampleTemplates = [
  {
    id: "crane",
    name: "Locação de Guindaste",
    category: "Içamento",
    summary: "Inclui mobilização, operador e checklist de segurança.",
    metrics: "26 utilizações",
  },
  {
    id: "earthworks",
    name: "Terraplanagem Pesada",
    category: "Infraestrutura",
    summary: "Pacote de horas máquina com adicional por combustível.",
    metrics: "Favorito da equipe",
  },
  {
    id: "heavy-cargo",
    name: "Transporte de Cargas Especiais",
    category: "Logística",
    summary: "Cobertura de rota, escolta e seguro integrado.",
    metrics: "Taxa de aceitação 92%",
  },
];

interface TemplateCard {
  id: string;
  name: string;
  category?: string | null;
  summary?: string | null;
  metrics?: string | null;
}

// clients will be loaded from API (use fallback samples when API isn't available)
const sampleClients = [
  { id: "1", name: "Construtora Horizonte" },
  { id: "2", name: "Indústria Metal Forte" },
  { id: "3", name: "Logística Integrada" },
];

const steps = [
  { id: 1, title: "Escolher modelo", description: "Inicie com um template ou proposta em branco." },
  { id: 2, title: "Detalhar proposta", description: "Dados do cliente, escopo e condições comerciais." },
  { id: 3, title: "Revisar & anexar", description: "Revisão final, anexos e preparação para envio." },
];

export default function NewProposalPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const api = useApi();

  const clientsQuery = useQuery<{ data: { id: string; name: string }[] }>(
    {
      queryKey: ["clients", "summary"],
      queryFn: () => api.get<{ data: { id: string; name: string }[] }>("/clients"),
      enabled: Boolean(api.token),
    }
  );

  const clients = useMemo(() => clientsQuery.data?.data ?? sampleClients, [clientsQuery.data]);
  const queryClient = useQueryClient();

  // Inline add client dialog state and mutation
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", companyName: "" });

  const createClient = useMutation({
    mutationFn: (payload: { name: string; companyName?: string }) =>
      api.post<{ data: { id: string; name: string } }>("/clients", payload),
    onSuccess: (res) => {
      // refresh clients and select the newly created client
      queryClient.invalidateQueries({ queryKey: ["clients", "summary"] });
      const created = res.data;
      setForm((prev) => ({ ...prev, clientId: created.id }));
      setNewClient({ name: "", companyName: "" });
      setAddClientOpen(false);
    },
  });

  const systemTemplatesQuery = useQuery<TemplatesResponse>({
    queryKey: ["templates", "system"],
    queryFn: () => api.get<TemplatesResponse>(`/templates?scope=system`),
    enabled: Boolean(api.token),
  });

  const customTemplatesQuery = useQuery<TemplatesResponse>({
    queryKey: ["templates", "custom"],
    queryFn: () => api.get<TemplatesResponse>(`/templates?scope=custom`),
    enabled: Boolean(api.token),
  });

  const fetchedTemplates = useMemo<TemplateCard[]>(() => {
    const system: TemplateSummary[] = systemTemplatesQuery.data?.data ?? [];
    const custom: TemplateSummary[] = customTemplatesQuery.data?.data ?? [];
    // flatten and map to a simplified shape used below
    return [...custom, ...system].map((t) => ({
      id: String(t.id),
      name: t.name,
      category: t.category ?? null,
      summary: t.description ?? null,
      metrics: t.accountId ? "Meu modelo" : "Modelo padrão",
    }));
  }, [systemTemplatesQuery.data, customTemplatesQuery.data]);

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    fetchedTemplates[0]?.id ?? sampleTemplates[0]?.id ?? null
  );
  const [form, setForm] = useState({
    clientId: sampleClients[0]?.id ?? "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    scope: "",
    notes: "",
  });

  // when clients load from API, set a sensible default clientId if none chosen
  useMemo(() => {
    if (!form.clientId && clients.length > 0) {
      setForm((prev) => ({ ...prev, clientId: clients[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  const activeTemplate = useMemo(() => {
    return (
      fetchedTemplates.find((template: TemplateCard) => template.id === selectedTemplate) ??
      sampleTemplates.find((template) => template.id === selectedTemplate) ??
      null
    );
  }, [selectedTemplate, fetchedTemplates]);

  const handleNext = () => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  const handlePrevious = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  return (
    <section className="space-y-8">
      <PageHeader
        title="Nova Proposta"
        description="Personalize a proposta escolhendo um modelo existente ou começando do zero. Você pode salvar rascunhos e continuar depois."
      />

      <Card className="space-y-6 p-6">
        <Stepper steps={steps} activeStep={stepIndex} />

        {stepIndex === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="flex flex-col justify-between gap-3 border border-outline/60 bg-[var(--color-surface-muted)] p-5 shadow-none">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-ink">Começar do zero</h3>
                <p className="text-sm text-muted">Crie uma proposta totalmente personalizada. Ideal para serviços únicos ou contratos complexos.</p>
              </div>
              <Button
                variant={selectedTemplate === null ? "primary" : "secondary"}
                onClick={() => setSelectedTemplate(null)}
              >
                Usar proposta em branco
              </Button>
            </Card>

            {(fetchedTemplates.length > 0 ? fetchedTemplates : sampleTemplates).map((template: TemplateCard) => {
              const isSelected = selectedTemplate === template.id;
              return (
                <Card
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    // auto-advance to next step for a smoother flow
                    setStepIndex(1);
                  }}
                  className={`flex cursor-pointer flex-col gap-3 border p-5 transition hover:-translate-y-1 hover:shadow-lg ${
                    isSelected
                      ? "border-primary bg-[var(--color-surface-muted)]/60 ring-2 ring-primary/20"
                      : "border-outline/60 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Badge tone="info">{template.category}</Badge>
                    <span>{template.metrics}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-ink">{template.name}</h3>
                    <p className="text-sm text-muted">{template.summary}</p>
                  </div>
                  <div className="mt-auto">
                    <Button
                      variant={isSelected ? "primary" : "secondary"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template.id);
                        setStepIndex(1);
                      }}
                    >
                      {isSelected ? "Selecionado" : "Selecionar modelo"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {stepIndex === 1 && (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={form.clientId} onValueChange={(value) => setForm((prev) => ({ ...prev, clientId: value }))}>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAddClientOpen(true)}>
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Inline Add Client Dialog */}
                <Dialog.Root open={addClientOpen} onOpenChange={setAddClientOpen}>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
                    <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center px-4 py-10">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newClient.name.trim()) return;
                          createClient.mutate({ name: newClient.name.trim(), companyName: newClient.companyName.trim() || undefined });
                        }}
                        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
                      >
                        <div className="flex items-center justify-between border-b border-outline/20 px-6 py-4">
                          <div>
                            <h3 className="text-lg font-semibold text-ink">Adicionar cliente</h3>
                            <p className="text-xs text-muted">Adicione um cliente sem sair da criação de proposta</p>
                          </div>
                          <Dialog.Close asChild>
                            <button
                              type="button"
                              className="rounded-full border border-outline bg-white p-2 text-ink shadow-sm transition hover:bg-primary-soft"
                              aria-label="close"
                              onClick={() => setAddClientOpen(false)}
                            >
                              ×
                            </button>
                          </Dialog.Close>
                        </div>
                        <div className="space-y-4 px-6 py-6">
                          <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={newClient.name} onChange={(e) => setNewClient((s) => ({ ...s, name: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Empresa</Label>
                            <Input value={newClient.companyName} onChange={(e) => setNewClient((s) => ({ ...s, companyName: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-outline/20 bg-[var(--color-surface-muted)]/40 px-6 py-4">
                          <Dialog.Close asChild>
                            <Button variant="ghost">Cancelar</Button>
                          </Dialog.Close>
                          <Button type="submit" loading={createClient.isPending}>Salvar</Button>
                        </div>
                      </form>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Título da proposta</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Locação de guindaste telescópico - obra X"
                    value={form.jobTitle}
                    onChange={(event) => setForm((prev) => ({ ...prev, jobTitle: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo selecionado</Label>
                  <div className="rounded-lg border border-outline bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-muted">
                    {activeTemplate ? activeTemplate.name : "Proposta em branco"}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope">Escopo do serviço</Label>
                <Textarea
                  id="scope"
                  placeholder="Descreva o escopo principal, equipamentos incluídos, equipe e requisitos do cliente."
                  value={form.scope}
                  onChange={(event) => setForm((prev) => ({ ...prev, scope: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Condições comerciais, cláusulas especiais ou SLA."
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>
            </div>

            <Card className="space-y-4 border border-outline/50 bg-[var(--color-surface-muted)]/70 p-5 shadow-none">
              <h3 className="text-sm font-semibold text-ink">Resumo rápido</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted">Cliente:</span> {clients.find((client) => client.id === form.clientId)?.name}
                </p>
                <p>
                  <span className="text-muted">Modelo:</span> {activeTemplate ? activeTemplate.name : "Proposta em branco"}
                </p>
                <p>
                  <span className="text-muted">Período:</span> {form.startDate || "–"} até {form.endDate || "–"}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline bg-transparent border-0 p-0"
                onClick={() => setStepIndex(1)}
              >
                Gerenciar clientes
              </button>
            </Card>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Anexos visuais (máx. 5 fotos)</Label>
                <UploadArea hint="Formatos aceitos: JPG, PNG – tamanho máximo 5MB" />
              </div>
              <div className="space-y-3 rounded-xl border border-outline bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-ink">Checklist antes de gerar</h3>
                <ul className="space-y-2 text-sm text-muted">
                  <li>• Revisar escopo e valores totais</li>
                  <li>• Confirmar equipamentos alocados e datas</li>
                  <li>• Adicionar termos padrão (ex: SLA, multas, seguros)</li>
                </ul>
              </div>
            </div>
            <Card className="space-y-4 border border-outline/50 bg-white p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-ink">Resumo</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted">Cliente</p>
                  <p className="font-medium text-ink">{clients.find((client) => client.id === form.clientId)?.name}</p>
                </div>
                <div>
                  <p className="text-muted">Modelo</p>
                  <p className="font-medium text-ink">{activeTemplate ? activeTemplate.name : "Proposta em branco"}</p>
                </div>
                <div>
                  <p className="text-muted">Título</p>
                  <p className="font-medium text-ink">{form.jobTitle || "Sem título"}</p>
                </div>
                <div>
                  <p className="text-muted">Período</p>
                  <p className="font-medium text-ink">{form.startDate || "–"} / {form.endDate || "–"}</p>
                </div>
              </div>
              <Button className="w-full">Gerar proposta</Button>
              <Button variant="ghost" className="w-full">
                Salvar rascunho
              </Button>
            </Card>
          </div>
        )}

        <div className="flex justify-between border-t border-outline/60 pt-4">
          <Button variant="ghost" onClick={handlePrevious} disabled={stepIndex === 0}>
            Voltar
          </Button>
          <div className="flex gap-2">
            {stepIndex < steps.length - 1 && (
              <Button onClick={handleNext}>Continuar</Button>
            )}
            {stepIndex === steps.length - 1 && <Button variant="primary">Finalizar geração</Button>}
          </div>
        </div>
      </Card>
    </section>
  );
}
